import './App.css'
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
