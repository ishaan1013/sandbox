const startercode = {
	node: [
		{ name: "index.js", body: `console.log("Hello World!")` },
		{
			name: "package.json",
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
			name: "package.json",
			body: `{
  "name": "react-app",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "@types/react": "^18.2.66",
    "@types/react-dom": "^18.2.22",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.1",
    "eslint-plugin-react-hooks": "^4.6.0"
  }
}`,
		},
		{
			name: "public/index.html",
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
			name: "src/App.css",
			body: `div {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  font-family: sans-serif;
}

h1 {
  color: #000;
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
			name: "src/App.jsx",
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
			name: "src/index.js",
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
}

export default startercode
