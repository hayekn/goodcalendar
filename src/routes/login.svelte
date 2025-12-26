<script>
  import { auth } from "../firebase.js";
  import { signInAnonymously, signOut, sendPasswordResetEmail, getAuth } from "firebase/auth";
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
  import { createEventDispatcher } from "svelte";
  import sparkles from "$lib/sparkles.gif";
  import '../app.css';

  const dispatch = createEventDispatcher();

  let name = ""
  let password = "";
  let error = "";
  let email = ""
  let passType = true;
  export let darkMode = () => {};

  async function loginAnon() {
    try {
      const userCredential = await signInAnonymously(auth);
    } catch (err) {
      console.error(err.code, err.message);
      alert(err.message);
    }
  }

  async function signup() {
    error = "";
    try {
      if (name.includes('@'))
        email = name;
      else
        email = `${name}@tracker.app`;
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      error = err.message;
    }
}

  async function login() {
    error = "";
    try {
      if (name.includes('@'))
        email = name;
      else
        email = `${name}@tracker.app`;

      const userCredential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      error = err.message;
    }
  }

  async function resetPassword() {
    error = "";
    if (name.includes('@'))
      email = name;
    else {
      error = "You can only reset the password of an account which uses a valid email.";
      return;
    }
    sendPasswordResetEmail(auth, email)
      .then(() => {error = "If this email is associated with an account, an email has been sent."})
      .catch((err) => {
        error = err.message;
    });
  }

function errorParser(error){
  switch(true){
    case error.startsWith("Firebase: Error (auth/invalid-credential)."): 
      return "Incorrect password or the account doesn't exist."
    case error.startsWith("Firebase: Missing password requirements:"):
      return "Your password must contain at least one uppercase character, lowercase character, and number. Minimum length is 6 characters."
    case error.startsWith("Firebase: Error (auth/email-already-in-use)."):
      return "This account already exists."
    case error.startsWith("Firebase: Error (auth/invalid-email)."):
      return "Your username cannot have any spaces. If using email, it must be valid."
    case error.startsWith("Firebase: Error (auth/missing-password)."):
      return "Missing password"
    default: return error
  }
}

</script>

<div class="parent">
  <br>
  <h1 class="title">Good Calendar</h1>
  <div style="margin-top: 2rem; position:relative">
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0.5rem;">
      <input
        type="text"
        placeholder="Username or Email"
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
        <button on:click={() => (passType = !passType)} class="login-show-password">
          {passType ? "show" : "hide"}
        </button>
      </div>
    </div>
  </div>
  <div style="position:relative">
    <div style="text-align:center">
      <button on:click={login} style="font-size:11pt;">Login</button>
      <button on:click={signup} style="font-size:11pt;">Sign up</button>
    </div>
    <div style="margin-top: 5px; text-align:center">
      <button on:click={resetPassword} style="font-size:11pt;">Forgot Password</button>
    </div>
  </div>
  <div class="login-hint">
  {#if error}
      {errorParser(error)}
  {/if}
  </div>
  <p style="text-align: center; max-width: 550px; color: var(--V-medium-text); font-size: 12pt">Track the quality of your days and nights using color-coded ratings and comments. Dedicated to my girlfriend and her chronic migranes.</p>
  <p style="text-align: center; max-width: 550px; color: var(--V-medium-text); font-size: 9pt">
    For demo, username and password: <span style="text-decoration:underline">goodcalendar</span>
  </p>
    <!-- <button on:click={loginAnon}>login anonymous</button> -->
     <span> 
      <a href="https://nicholashayek.com/" style="margin: 0; padding: 0px 10px">
            <svg height="25px" viewBox="0 0 576 512"><path fill="var(--V-medium-text)" d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/></svg>
      </a>         
      <button style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 10px" on:click={darkMode}>
      <svg height="25px" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg></button>
    </span>
</div>