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
  } catch (err) {
    console.error(err);
    error = err.message;
  }
}

function errorParser(error){
  switch(true){
    case error.startsWith("Firebase: Error (auth/invalid-credential)."): 
      return "Incorrect password or the account doesn't exist"
    case error.startsWith("Firebase: Missing password requirements:"):
      return "Your password must contain at least one uppercase character, lowercase character, and number. Minimum length is 6 characters."
    case error.startsWith("Firebase: Error (auth/email-already-in-use)."):
      return "This account already exists."
    case error.startsWith("Firebase: Error (auth/invalid-email)."):
      return "Your username cannot have any spaces"
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
        <button on:click={() => (passType = !passType)} class="login-show-password">
          {passType ? "show" : "hide"}
        </button>
      </div>
    </div>
  </div>
  <div style="position:relative">
    <div style="align-items: center">
      <button on:click={login}>Login</button>
      <button on:click={signup}>Sign up</button>
    </div>
  </div>
  <div class="login-hint">
  {#if error}
      {errorParser(error)}
  {/if}
  </div>
  <p style="text-align: center; max-width: 550px; color: var(--medium-text);">Track the quality of your days and nights using color-coded ratings and comments. Dedicated to my girlfriend and her chronic migranes.</p>
    <!-- <button on:click={loginAnon}>login anonymous</button> -->
</div>