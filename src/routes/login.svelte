<script>
  import { auth } from "../firebase.js";
  import { signInAnonymously, signOut } from "firebase/auth";
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
  import { createEventDispatcher } from "svelte";
  import sparkles from "$lib/sparkles.gif";
  import '../app.css';

  const dispatch = createEventDispatcher();

  let name = ""
  let password = "";
  let error = "";

  async function loginAnon() {
    try {
      const userCredential = await signInAnonymously(auth);
      dispatch("loggedin", { uid: userCredential.user.uid});
    } catch (err) {
      console.error(err.code, err.message);
      alert(err.message);
    }
  }

  async function signup() {
  error = "";
  try {
    const email = `${name}@tracker.app`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    dispatch("loggedin", { uid: userCredential.user.uid });
  } catch (err) {
    console.error(err);
    error = err.message;
  }
}

async function login() {
  error = "";
  try {
    const email = `${name}@tracker.app`;
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    dispatch("loggedin", { uid: userCredential.user.uid });
  } catch (err) {
    console.error(err);
    error = err.message;
  }
}

function errorParser(error){
  switch(error){
    case "Firebase: Error (auth/invalid-credential).": 
      return "Incorrect password or the account doesn't exist"
    case "Firebase: Missing password requirements: [Password must contain at least 6 characters] (auth/password-does-not-meet-requirements).":
      return "Password must contain at least 6 characters"
    case "Firebase: Error (auth/email-already-in-use).":
      return "This account already exists."
    case "Firebase: Error (auth/invalid-email).":
      return "Your username cannot have any spaces"
    default: return error
  }
}

</script>

<div class="login">
  <br>
  <h2 style="background: url({sparkles}); no-repeat; background-size: cover; 
  -webkit-background-clip: text; -webkit-text-fill-color: transparent">The Good Calendar</h2>
  <p>Here, you can log the quality of your days and nights for posterity. Dedicated to my girlfriend and her chronic migranes.</p>
    <input
      type="text"
      placeholder="Username"
      bind:value={name}
      class="login_input"
    />
    <input
      type="text"
      placeholder="Password"
      class="login_input"
      bind:value={password}
    />
    {#if error}<p>{errorParser(error)}</p>{/if}
    <div style="display: inline;">
      <button on:click={login}>Login</button> <button on:click={signup}>Sign up</button> 
    </div>
      <!-- <button on:click={loginAnon}>login anonymous</button> -->
</div>

<style>
.login {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 80%;
  margin: 0 auto; 
}
.login_input {
  border-bottom: 2px solid black;
  border-top: 0px;
  border-left: 0px;
  border-right: 0px;
  font-family: Courier, monospace;
  outline: none;
  box-shadow: none;
}
</style>
