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
  let passType = true;

  async function loginAnon() {
    try {
      const userCredential = await signInAnonymously(auth);
      // dispatch("loggedin", { uid: userCredential.user.uid});
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
    // dispatch("loggedin", { uid: userCredential.user.uid });
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
    // dispatch("loggedin", { uid: userCredential.user.uid });
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
    case "Firebase: Error (auth/missing-password).":
      return "Missing password"
    default: return error
  }
}

</script>

<div class="login">
  <br>
  <h2 style="background: url({sparkles}); no-repeat; background-size: cover; 
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0px">The Good Calendar</h2>
  <p style="text-align: center; margin-top: 0px">Here, you can log the quality of your days and nights for posterity. Dedicated to my girlfriend and her chronic migranes.</p>
  <div style="top: 3rem; position:relative">
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;">
      <input
        type="text"
        placeholder="Username"
        bind:value={name}
        class="login_input"
        style="width: 200px;"
      />
      <div style="display: flex; align-items: center; position: relative;">
        <input
          type={passType ? "password" : "text"}
          placeholder="Password"
          class="login_input"
          bind:value={password}
          style="width: 200px;"
        />
        <button
          style="
            position: absolute;
            right: -45px;
            top: 50%;
            transform: translateY(-50%);
            border-radius: 10%;
            font-size: 0.75rem;
            padding: 0.1rem 0.25rem;
            white-space: nowrap;
          "
          on:click={() => (passType = !passType)}
          >
          {passType ? "show" : "hide"}
        </button>
      </div>
    </div>
  </div>
  <div style="top: 3rem; position:relative">
    <div style="align-items: center">
      <button on:click={login}>Login</button>
      <button on:click={signup}>Sign up</button>
    </div>
  </div>
  <div style="top: 3rem; position:relative">
  {#if error}
        {errorParser(error)}
  {/if}
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
  border-top: none;
  border-left: none;
  border-right: none;
  font-family: Courier, monospace;
  outline: none;
  box-shadow: none;
  border-radius: 0;
  caret-color: black;
}

input[type="search"] {
  -webkit-appearance: none;
}
</style>
