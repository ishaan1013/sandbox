const assert = require('node:assert/strict')
const { test, afterEach } = require('node:test')
const Module = require('node:module')
const React = require('react')
const Renderer = require('react-test-renderer')
require('ts-node').register({
  transpileOnly: true,
  skipProject: true,
  compilerOptions: {
    target: 'ES2021', module: 'CommonJS', moduleResolution: 'Node',
    jsx: 'react-jsx', esModuleInterop: true,
  },
})

const errors = []
let refreshes = 0
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (parent?.filename.endsWith('/components/editor/generate.tsx')) {
    if (request === '../ui/button') return { Button: ({ children, ...props }) => React.createElement('button', props, children) }
    if (request === 'lucide-react') return new Proxy({}, { get: () => () => null })
    if (request === '@monaco-editor/react') return { Editor: ({ value }) => React.createElement('pre', {}, value) }
    if (request === 'sonner') return { toast: { error: (message) => errors.push(message) } }
    if (request === 'next/navigation') return { useRouter: () => ({ refresh: () => refreshes++ }) }
  }
  return originalLoad.call(this, request, parent, isMain)
}
const GenerateInput = require('../components/editor/generate.tsx').default
Module._load = originalLoad

const saved = new Map()
const storage = {
  getItem: (key) => saved.get(key) ?? null,
  setItem: (key, value) => saved.set(key, value),
}
global.localStorage = storage
const renderers = []
function mount(socket = { events: [], emit(...args) { this.events.push(args) } }) {
  const accepted = []
  let renderer
  Renderer.act(() => {
    renderer = Renderer.create(React.createElement(GenerateInput, {
      user: { generations: 0 }, socket, width: 350,
      data: { fileName: 'demo.ts', code: 'const privateCode = 1', line: 2 },
      editor: { language: 'typescript' }, onExpand() {},
      onAccept(code) { accepted.push(code) }, onClose() { renderer.unmount() },
    }))
  })
  renderers.push(renderer)
  return { renderer, socket, accepted }
}
function setPrompt(view, value) {
  Renderer.act(() => view.renderer.root.findByProps({ placeholder: 'Generate code with a prompt' }).props.onChange({ target: { value } }))
}
function text(node) {
  return typeof node === 'string' ? node : (node.children ?? []).map(text).join('')
}
function click(view, label) {
  const button = view.renderer.root.findAllByType('button').find((node) => text(node).includes(label))
  assert.ok(button, `button ${label}`)
  Renderer.act(() => { button.props.onClick() })
}
function lastGeneration(view) {
  return view.socket.events.filter((args) => args[0] === 'generateCode').at(-1)
}
function respond(event, data = { success: true, response: 'const result = 2' }) {
  Renderer.act(() => event.at(-1)(data))
}
afterEach(() => {
  for (const renderer of renderers.splice(0)) Renderer.act(() => renderer.unmount())
  saved.clear(); errors.length = 0; refreshes = 0; global.localStorage = storage
})

test('fresh popup enables web references; regenerate and follow-up keep one research identity', () => {
  const view = mount()
  assert.equal(view.renderer.root.findByProps({ type: 'checkbox' }).props.checked, true)
  setPrompt(view, 'Use the current React API')
  click(view, 'Generate Code')
  const first = lastGeneration(view)
  assert.equal(first[4], 'Use the current React API')
  assert.equal(first[5].webSearch, true)
  assert.match(first[5].searchSessionId, /^[0-9a-f-]{36}$/)
  respond(first)
  click(view, 'Re-Generate')
  const retry = lastGeneration(view)
  assert.equal(retry[4], first[4])
  assert.equal(retry[5].searchSessionId, first[5].searchSessionId)
  assert.notEqual(retry[5].requestId, first[5].requestId)
  respond(retry)
  setPrompt(view, 'Now use its streaming API')
  click(view, 'Generate Code')
  assert.equal(lastGeneration(view)[5].searchSessionId, first[5].searchSessionId)
})

test('saved disable is respected, explicit checkbox override persists, new popup gets new identity', () => {
  saved.set('sandbox.webReferences', 'false')
  const first = mount()
  assert.equal(first.renderer.root.findByProps({ type: 'checkbox' }).props.checked, false)
  setPrompt(first, 'Create a button')
  click(first, 'Generate Code')
  const disabled = lastGeneration(first)
  assert.equal(disabled[5].webSearch, false)
  respond(disabled)
  Renderer.act(() => first.renderer.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: true } }))
  assert.equal(saved.get('sandbox.webReferences'), 'true')
  click(first, 'Re-Generate')
  const overridden = lastGeneration(first)
  assert.equal(overridden[5].webSearch, true)
  assert.equal(overridden[5].searchSessionId, disabled[5].searchSessionId)
  respond(overridden)
  Renderer.act(() => first.renderer.unmount())
  const next = mount(first.socket)
  setPrompt(next, 'Another generation')
  click(next, 'Generate Code')
  assert.notEqual(lastGeneration(next)[5].searchSessionId, overridden[5].searchSessionId)
})

test('interleaved popups on one socket isolate identity; failures and retry retain identity', () => {
  const first = mount()
  const second = mount(first.socket)
  setPrompt(first, 'First request'); click(first, 'Generate Code')
  const a = lastGeneration(first)
  setPrompt(second, 'Second request'); click(second, 'Generate Code')
  const b = lastGeneration(second)
  assert.notEqual(a[5].searchSessionId, b[5].searchSessionId)
  respond(a, { success: false, error: 'Code generation failed.' })
  assert.deepEqual(errors, ['Code generation failed.'])
  click(first, 'Generate Code')
  const retry = lastGeneration(first)
  assert.equal(retry[5].searchSessionId, a[5].searchSessionId)
  respond(b); respond(retry)
})

test('source links remain separate from accepted code and reject unsafe URLs', () => {
  const view = mount()
  setPrompt(view, 'Read current docs'); click(view, 'Generate Code')
  respond(lastGeneration(view), {
    success: true, response: 'const onlyCode = true', sources: [
      { url: 'https://react.dev/reference/react', title: 'React reference' },
      { url: 'javascript:alert(1)', title: 'unsafe' },
      { url: 'https://user:password@example.com/private', title: 'credentials' },
      { url: 'data:text/html,test' }, { url: 'invalid' },
    ],
  })
  const links = view.renderer.root.findAllByType('a')
  assert.equal(links.length, 1)
  assert.equal(links[0].props.href, 'https://react.dev/reference/react')
  assert.equal(links[0].props.rel, 'noopener noreferrer')
  click(view, 'Accept')
  assert.deepEqual(view.accepted, ['const onlyCode = true'])
  assert.equal(refreshes, 1)
})

test('unmount cancels only the active request and ignores its late response', () => {
  const view = mount()
  setPrompt(view, 'A slow request'); click(view, 'Generate Code')
  const request = lastGeneration(view)
  Renderer.act(() => view.renderer.unmount())
  assert.deepEqual(view.socket.events.at(-1), ['cancelGeneration', request[5].requestId])
  respond(request)
  assert.equal(refreshes, 0)
})

test('unavailable browser storage still allows an explicit search disable', () => {
  global.localStorage = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } }
  const view = mount()
  Renderer.act(() => view.renderer.root.findByProps({ type: 'checkbox' }).props.onChange({ target: { checked: false } }))
  setPrompt(view, 'Create a button'); click(view, 'Generate Code')
  assert.equal(lastGeneration(view)[5].webSearch, false)
})

test('a whitespace prompt cannot start a generation', () => {
  const view = mount()
  setPrompt(view, '  \n ')
  const button = view.renderer.root.findAllByType('button').find((node) => text(node).includes('Generate Code'))
  assert.equal(button.props.disabled, true)
  click(view, 'Generate Code')
  assert.equal(lastGeneration(view), undefined)
})
