import {createStaticServer} from './static-server.mjs';
const [root='output/pages/dist',basePath='/repository/',port='8790']=process.argv.slice(2);
createStaticServer({root,basePath}).listen(Number(port),'127.0.0.1',()=>console.log(`Preview: http://localhost:${port}${basePath}`));
