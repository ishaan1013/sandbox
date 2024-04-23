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
};

export default startercode;
