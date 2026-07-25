import { createApp } from "./infrastructure/transport/app";

const port = 3000;

createApp()
  .then((app) => {
    app.listen(port, () => {
      console.log(`Server listening on http://localhost:${port}`);
    });
  })
  .catch((error: unknown) => {
    console.error("No se pudo iniciar la aplicación:", error);
    process.exit(1);
  });
