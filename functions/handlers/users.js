const { db, admin } = require("../util/admin");
const firebase = require("firebase");

const config = require("../util/config");
const { validSignIn, validLogin } = require("../util/valid");

exports.signUp = (req, res) => {
  const buildNewUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { valid, errors } = validSignIn(buildNewUser);
  if (!valid) {
    return res.status(400).json(errors);
  }

  let token, userId;
  db.doc("/users/" + buildNewUser.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(
            buildNewUser.email,
            buildNewUser.password
          );
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: buildNewUser.handle,
        email: buildNewUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      db.doc("/users/" + buildNewUser.handle).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      if (err.code === "auth/email-already-in-use") {
        return res.status(400).json({ email: "Email is already in use." });
      }
      return res.status(500).json({ error: err.code });
    });
};
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  const { valid, errors } = validLogin(user);
  if (!valid) {
    return res.status(400).json(errors);
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json({ token });
    })
    .catch((error) => {
      if (error.code === "auth/wrong-password") {
        return res.status(403).json({ general: "Wrong credentials" });
      }
      return res.status(500).json({ error: error.code });
    });
};

exports.uploadImage = (req, res) => {
  const BusBoy = require("busboy");
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  const busboy = new BusBoy({ headers: req.headers });
  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
    const imageExtension = filename.split(".")[filename.split(".").length - 1];
    imageFileName = Math.round(Math.random() * 1000) + "." + imageExtension;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });
  busboy.on("finish", () => {
    admin.storage().bucket().upload(imageToBeUploaded.filepath),
      {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype,
          },
        },
      }
        .then(() => {
          const imageUrl =
            "https://firebasestorage.googleapis.com/v0/b/" +
            config.storageBucket +
            "/o/" +
            imageFileName +
            "?alt=media";
          return db.doc("/users/" + req.user.handle).update({ imageUrl });
        })
        .then(() => {
          return res.json({ message: "Uploaded without error" });
        })
        .catch((err) => {
          return res.status(500).json({ error: error.code });
        });
  });
};
