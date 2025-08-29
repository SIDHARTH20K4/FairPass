// backend/server.ts
import express from "express"
import bodyParser from "body-parser"
import { approveUser } from "./routes/approveUsers"

const app = express()
app.use(bodyParser.json())

app.post("/api/approveUser", approveUser)

app.listen(4000, () => {
    console.log("🚀 Backend running on http://localhost:4000")
})