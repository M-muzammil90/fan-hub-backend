const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((error) => {
    console.error("MongoDB Error:", error.message);
    process.exit(1);
  });
