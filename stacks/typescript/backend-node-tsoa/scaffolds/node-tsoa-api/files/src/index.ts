import { createServer } from './server';

const port = Number(process.env.PORT ?? 3000);

createServer().listen(port, () => {
  console.log(`Listening on port ${port}`);
});
