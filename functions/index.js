const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const express = require("express");
const app = express();

const cors = require("cors")({ origin: true });
// use it before all route definitions
app.use(cors);

var firebaseConfig = {
  apiKey: "AIzaSyAjwjz_Zz3APajIvseaDEwfZAYfIxWFguw",
  authDomain: "react-social-2b464.firebaseapp.com",
  databaseURL: "https://react-social-2b464.firebaseio.com",
  projectId: "react-social-2b464",
  storageBucket: "react-social-2b464.appspot.com",
  messagingSenderId: "425981784304",
  appId: "1:425981784304:web:eabbc851e2588bc31f1235",
  measurementId: "G-B7R453YBJD",
};

const firebase = require("firebase");
firebase.initializeApp(firebaseConfig);
const db = admin.firestore();
app.get("/screams", (req, res) => {
  cors(req, res, () => {
    admin
      .firestore()
      .collection("screams")
      .orderBy("createdAt", "desc")
      .get()
      .then((data) => {
        let screams = [];
        data.forEach((doc) => {
          screams.push({
            screamId: doc.id,
            screamId: doc.id, //Code was bugging only using one of these
            url: doc.data().url,
            body: doc.data().body,
            bodyOfPost: doc.data().bodyOfPost,
            userHandle: doc.data().userHandle,
            createdAt: doc.data().createdAt,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            rating: doc.data().rating,
          });
        });
        res.send(screams);
        return res.json(screams);
      })
      .catch((err) => console.error(err));
  });
});

const FBAuth = (req, res, next) => {
  let idToken;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer ")
  ) {
    idToken = req.headers.authorization.split("Bearer ")[1];
  } else {
    return res.status(403).json({ error: "You Shall Not Pass." });
  }
  admin
    .auth()
    .verifyIdToken(idToken)
    .then((decodedToken) => {
      req.user = decodedToken;
      return db
        .collection("users")
        .where("userId", "==", req.user.uid)
        .limit(1)
        .get();
    })
    .then((data) => {
      req.user.handle = data.docs[0].data().handle;
      req.user.imageUrl = data.docs[0].data().imageUrl;
      return next();
    })
    .catch((error) => {
      return res.status(403).json(error);
    });
};

app.get("/searchMemes/:searchQuery", (req, res) => {
  admin
    .firestore()
    .collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        if (
          doc
            .data()
            .body.toLowerCase()
            .includes(req.params.searchQuery.toLowerCase())
        ) {
          screams.push({
            screamId: doc.id,
            screamId: doc.id, //Code was bugging only using one of these
            url: doc.data().url,
            body: doc.data().body,
            bodyOfPost: doc.data().bodyOfPost,
            userHandle: doc.data().userHandle,
            createdAt: doc.data().createdAt,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            rating: doc.data().rating,
          });
        }
      });
      res.send(screams);
      return res.json(screams);
    })
    .catch((err) => console.error(err));
});
app.get("/grabHandleWithToken", FBAuth, (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((data) => {
      return res.status(200).json({ worked: data.data() });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

app.post("/scream", FBAuth, (req, res) => {
  const newScream = {
    body: req.body.body,
    bodyOfPost: req.body.bodyOfPost,
    url: req.body.url,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
    rating: 5,
  };
  admin
    .firestore()
    .collection("screams")
    .add(newScream)
    .then((doc) => {
      const resScream = newScream;
      resScream.screamId = doc.id;
      res.json(resScream);
    })
    .catch((err) => {
      res.status(500).json({ error: "Something Unexpected Happened!" });
    });
});

const isEmpty = (string) => {
  if (string.trim() === "") {
    return true;
  }
  return false;
};

const isEmail = (email) => {
  const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  if (email.match(emailRegEx)) {
    return true;
  }
  return false;
};

// Signup Route

app.post("/signup", (req, res) => {
  const buildNewUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };
  let errors = {};
  if (isEmpty(buildNewUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(buildNewUser.email)) {
    errors.email = "Not valid";
  }
  if (isEmpty(buildNewUser.password)) {
    errors.password = "Must not be empty ";
  } else if (buildNewUser.password !== buildNewUser.confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  if (isEmpty(buildNewUser.handle)) {
    errors.handle = "Must not be empty";
  }
  if (Object.keys(errors).length > 0) {
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
        imageUrl:
          "https://firebasestorage.googleapis.com/v0/b/" +
          firebaseConfig.storageBucket +
          "/o/" +
          "no-img.png.png" +
          "?alt=media",
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
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };
  let errors = {};

  if (isEmpty(user.email)) {
    errors.email = "Must not be empty";
  }
  if (isEmpty(user.password)) {
    errors.email = "Must not be empty";
  }
  if (Object.keys(errors).length > 0) {
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
});

const reduceUserDetails = (data) => {
  let userDetails = {};
  if (!isEmpty(data.bio.trim())) {
    userDetails.bio = data.bio;
  }
  if (!isEmpty(data.website.trim())) {
    userDetails.website = data.website.trim();
  }
  if (!isEmpty(data.location.trim())) {
    userDetails.location = data.location.trim();
  }
  return userDetails;
};
app.post("/update", FBAuth, (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc("/users/" + req.user.handle)
    .update(userDetails)
    .then(() => {
      return res.json({ message: "Details added" });
    })
    .catch(() => {
      return res.status(500).json({ error: err.code });
    });
});

//returns all user details including liked stuff
app.get("/details", FBAuth, (req, res) => {
  let userData = {};
  db.doc("/users/" + req.user.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return res.json(userData);
    })
    .catch((err) => {
      return res.code(500).json({ error: err.code });
    });
});


app.get("/screamdetails/:screamId", (req, res) => {
  let screamData = {};
  db.doc(`/screams/${req.params.screamId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Scream not found" });
      }
      screamData = doc.data();
      screamData.screamId = doc.id;

      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("screamId", "==", screamData.screamId) //Create firebase index for this to work.
        .get();
    })
    .then((data) => {
      screamData.comments = [];
      data.forEach((doc) => {
        screamData.comments.push(doc.data());
      });
      return res.json(screamData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
});

app.post("/screamcomment/:screamId", FBAuth, (req, res) => {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ error: "Must not be empty." });
  }
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    rating: req.body.rating,
  };
  db.doc("/screams/" + req.params.screamId)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "scream not found" });
      }
      const screamDocument = db.doc(`/screams/${req.params.screamId}`);
      screamDocument.get().then((data) => {
        var calc =
          (parseInt(data.data().rating) + parseInt(req.body.rating)) / 2;
        screamDocument.update({ rating: calc });
      });

      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      return res.status(500).json({ error: "Something went wrong." });
    });
});

//Like Scream
app.get("/screamlike/:screamId", FBAuth, (req, res) => {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("screamId", "==", req.params.screamId)
    .limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData;

  screamDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Scream not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            screamId: req.params.screamId,
            userHandle: req.user.handle,
            screamData,
          })
          .then(() => {
            screamData.likeCount++;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            return res.json(screamData);
          });
      } else {
        return res.status(400).json({ error: "Scream already liked" });
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
});

app.post("/userDetail/:handle", FBAuth, (req, res) => {
  db.doc(`/users/${req.user.handle}`)
    .update(req.body)
    .then(() => {
      return res.json({ message: "Details added successfully" });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

app.get("/getUserDetail/:handle", FBAuth, (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`)
    .get()
    .then((data) => {
      return res.status(200).json({ worked: data.data() });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

app.post("/follow/:handleOfFollowing", FBAuth, (req, res) => {
  db.doc("/users/" + req.user.handle)
    .update({
      following: admin.firestore.FieldValue.arrayUnion(
        req.params.handleOfFollowing
      ),
    })
    .then((data) => {
      return res.status(200).json({ worked: "Success" });
    })
    .catch((err) => {
      return res.status(404).json({ error: "Sorry for the error" });
    });
});

app.get("/getFollowers", FBAuth, (req, res) => {
  let userData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((data) => {
      return res.status(200).json({ data: data.data().following });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

app.get("/getFollowersMemes", FBAuth, (req, res) => {
  let userData = {};

  db.doc(`/users/${req.user.handle}`)
    .get()
    .then((data) => {
      return data.data().following;
    })
    .then((list) => {
      admin
        .firestore()
        .collection("screams")
        .orderBy("createdAt", "desc")
        .get()
        .then((data) => {
          let screams = [];
          data.forEach((doc) => {
            list.forEach((handleFollowed) => {
              if (doc.data().userHandle == handleFollowed) {
                screams.push({
                  screamId: doc.id,
                  screamId: doc.id, //Code was bugging only using one of these
                  url: doc.data().url,
                  body: doc.data().body,
                  bodyOfPost: doc.data().bodyOfPost,
                  userHandle: doc.data().userHandle,
                  createdAt: doc.data().createdAt,
                  userImage: doc.data().userImage,
                  likeCount: doc.data().likeCount,
                  commentCount: doc.data().commentCount,
                  rating: doc.data().rating,
                });
              }
            });
          });
          res.send(screams);
          return res.json(screams);
        })
        .catch((err) => console.error(err));
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

app.get("/verifyToken/:idToken", (req, res) => {
  admin
    .auth()
    .verifyIdToken(req.params.idToken)
    .then(function (decodedToken) {
      return res.status(200).json({ status: "verified" });
      // ...
    })
    .catch(function (error) {
      // Handle error
      return res.status(404).json({ status: "Not Verified" });
    });
});

app.get("/getlikedScreams", FBAuth, (req, res) => {
  let userData = {};

  db.doc("/users/" + req.user.handle)
    .get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection("likes")
          .where("userHandle", "==", req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach((doc) => {
        userData.likes.push(doc.data());
      });
      return userData;
    })
    .then((memes) => {
      memeLikeList = ["tester"];

      memes.likes.forEach((memes) => {
        memeLikeList.push("helper444()");
      });
      res.json(memeLikeList);
    })

    .catch((err) => {
      return res.code(500).json({ error: err.code });
    });
});

exports.api = functions.https.onRequest(app);
