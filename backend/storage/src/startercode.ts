const startercode = {
	node: [
		{ name: 'index.js', body: `console.log("Hello World!")` },
		{
			name: 'package.json',
			body: `{
  "name": "nodejs",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "keywords": [],
  "author": "",
  "license": "ISC",
  "dependencies": {
    "@types/node": "^18.0.6"
  }
}`,
		},
	],
	react: [
		{
			name: 'package.json',
			body: `{
  "name": "react",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint . --ext js,jsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "@vitejs/plugin-react": "^4.2.1",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.6",
    "vite": "^5.2.0"
  }
}`,
		},
		{
			name: 'vite.config.js',
			body: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
  },
})
`,
		},
		{
			name: 'index.html',
			body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>React Starter Code</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`,
		},
		{
			name: 'src/App.css',
			body: `div {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

h1 {
  color: #fff;
  margin: 0;
}

p {
  color: #777;
  margin: 0;
}

button {
  padding: 8px 16px;
  margin-top: 16px;
}`,
		},
		{
			name: 'src/App.jsx',
			body: `import './App.css'
import { useState } from 'react'

function App() {

  const [count, setCount] = useState(0)

  return (
    <div>
      <h1>React Starter Code</h1>
      <p>
        Edit App.jsx to get started.
      </p>
      <button onClick={() => setCount(count => count + 1)}>
        Clicked {count} times
      </button>
    </div>
  )
}

export default App
`,
		},
		{
			name: 'src/main.jsx',
			body: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
`,
		},
	],
};

export default startercode;
