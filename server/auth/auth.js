const jwt = require("jsonwebtoken");

module.exports = {
  userAuth: (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (token == null) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }

      
     
      next();
    });
  },
   dataEntryAuth: (req, res, next) => {
    const dataEntryKey = req.headers["dataentrykey"]; // headers are lowercase

    if (!dataEntryKey) {
      return res
        .status(401)
        .json({ success: false, message: "No data entry key provided" });
    }

    if (dataEntryKey !== process.env.DATA_ENTRY_KEY) {
      return res
        .status(403)
        .json({ success: false, message: "Invalid data entry key" });
    }

    next();
  },

//   adminAuth: (req, res, next) => {
//     const authHeader = req.headers["authorization"];
//     const token = authHeader && authHeader.split(" ")[1];
//     console.log(token)
//     if (token == null) return res.sendStatus(401);

//     jwt.verify(token, process.env.ADMIN_ACCESS_TOKEN_SECRET, (err, user) => {
//       if (err) return res.sendStatus(403);
//       console.log(user)
//       req.user = user;

//       next();
//     });
//   },
 
};
