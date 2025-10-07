import connectDB from "./config/db.js";
import { testUsers } from "./tests/testUsers.js";

connectDB();

// Ejecutar la prueba
testUsers();
