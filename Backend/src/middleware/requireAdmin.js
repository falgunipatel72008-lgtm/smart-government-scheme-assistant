import jwt from "jsonwebtoken";

export function requireAdmin(jwtSecret) {
  return (req, res, next) => {
    const authorization = req.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Authentication required" });
    }

    try {
      const payload = jwt.verify(match[1], jwtSecret, { algorithms: ["HS256"] });
      if (typeof payload === "string" || typeof payload.sub !== "string") {
        return res.status(401).json({ error: "Invalid authentication token" });
      }

      req.admin = { id: payload.sub };
      return next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired authentication token" });
    }
  };
}
