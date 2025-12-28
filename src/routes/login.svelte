<script>
  import { auth, db } from "../firebase.js";
  import { signInAnonymously, signOut, sendPasswordResetEmail } from "firebase/auth";
  import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
  import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
  import sparkles from "$lib/sparkles.gif";
  import chart from "$lib/chart.svg"
  import '../app.css';
  import { 
    deriveKeyFromPassword,
    deriveKeyFromSecurityAnswer,
    generateMasterKey,
    wrapMasterKey,
    unwrapMasterKey
  } from '../lib/encryption.js';
  import { loggedIn } from '$lib/stores/authSignal';
  import { fade } from 'svelte/transition';
  import {cubicIn, cubicOut} from 'svelte/easing';

  let name = ""
  let password = "";
  let error = "";
  let email = ""
  let passType = true;
  let privacyNotice = false;

  let securityQuestion = "";
  let securityAnswer = "";
  let availableQuestions = [
    "What is your mother's maiden name?",
    "What city were you born in?",
    "What was the name of your first pet?",
    "What is your favorite book?",
    "What was the make of your first car?"
  ];
  let showRecoveryPrompt = false;
  let showSecuritySetup = false;

  let recoveryAnswer = "";
  let pendingUserId = null;
  let pendingPassword = null;
  let userSecurityQuestion = "";
  let existingUser;

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
    error = "Signing up...";
    try {
      if (name.includes('@')) {
        email = name;

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        pendingPassword = password;
        pendingUserId = userId;

        console.log("Created temporary user.")

        showSecuritySetup = true;

        window.addEventListener("beforeunload", function(e) {
          if (showSecuritySetup)
            event.returnValue = 'Are you sure?';
        });
      } else {
        email = `${name}@tracker.app`;
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        pendingPassword = password;
        pendingUserId = userId;

        const masterKey = await generateMasterKey();
        const passwordKEK = await deriveKeyFromPassword(pendingPassword, pendingUserId);
        const wrappedWithPassword = await wrapMasterKey(masterKey, passwordKEK);

        await setDoc(doc(db, 'users', pendingUserId), {
        wrappedMasterKey: wrappedWithPassword,
        encryptionEnabled: true,
        timestamp: Date.now()
        }, { merge: true }); 
    
        window.sessionEncryptionKey = masterKey;
        pendingUserId = null;
        pendingPassword = null;
        console.log("Completed user registration.");
        loggedIn.set(true);
      }
    } catch (err) {
        console.error(err);
        error = err.message;
    }
  }

  async function completeSignup() {
  
    if (!securityQuestion || !securityAnswer.trim()) {
      error = "Please select a question and provide an answer";
      return;
    }
    
    try {
      const masterKey = await generateMasterKey();
      const passwordKEK = await deriveKeyFromPassword(pendingPassword, pendingUserId);
      const wrappedWithPassword = await wrapMasterKey(masterKey, passwordKEK);
      
      const securityKEK = await deriveKeyFromSecurityAnswer(securityAnswer, pendingUserId);
      const wrappedWithSecurity = await wrapMasterKey(masterKey, securityKEK);
      
      await setDoc(doc(db, 'users', pendingUserId), {
        wrappedMasterKey: wrappedWithPassword,
        wrappedRecoveryKey: wrappedWithSecurity,
        securityQuestion: securityQuestion,
        encryptionEnabled: true,
        timestamp: Date.now()
      }, { merge: true });
      
      window.sessionEncryptionKey = masterKey;
      
      showSecuritySetup = false;
      securityQuestion = "";
      securityAnswer = "";
      pendingUserId = null;
      pendingPassword = null;
      
      console.log("Completed user registration.");
      loggedIn.set(true);
      
    } catch (err) {
      console.error(err);
      error = err.message;
      return;
    }
  }

  async function cancelSignup() {
    await deleteDoc(doc(db, "users", pendingUserId));
    auth.currentUser.delete();
    console.log("Deleted temporary user.")
    showSecuritySetup = false;

    securityQuestion = "";
    securityAnswer = "";
    pendingUserId = null;
    pendingPassword = null;
  }

  async function login() {
    error = "Logging in...";
    try {
      if (name.includes('@')) {
        email = name;

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const userId = userCredential.user.uid;
        const userDoc = await getDoc(doc(db, 'users', userId));
        const userData = userDoc.data();
        const passwordKEK = await deriveKeyFromPassword(password, userId);
        
        try {
          const masterKey = await unwrapMasterKey(userData.wrappedMasterKey, passwordKEK);
          window.sessionEncryptionKey = masterKey;
          console.log("Login successful");
        } catch (decryptError) {
          console.log("Decryption Error. Prompting for security question");
          pendingUserId = userId;
          pendingPassword = password;
          userSecurityQuestion = userData.securityQuestion;
          showRecoveryPrompt = true;
          error = "";
          return;
        }
        loggedIn.set(true);
      }
      else {
          email = `${name}@tracker.app`;
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const userId = userCredential.user.uid;
          const userDoc = await getDoc(doc(db, 'users', userId));

          if (!userDoc.exists() || !userDoc.data().wrappedMasterKey) {
            const masterKey = await generateMasterKey();
            const passwordKEK = await deriveKeyFromPassword(password, userId);
            const wrappedWithPassword = await wrapMasterKey(masterKey, passwordKEK);

            await setDoc(doc(db, 'users', userId), {
            wrappedMasterKey: wrappedWithPassword,
            encryptionEnabled: true,
            timestamp: Date.now()
            }, { merge: true }); 
        
            window.sessionEncryptionKey = masterKey;
          } else{
            const userData = userDoc.data();
            const passwordKEK = await deriveKeyFromPassword(password, userId);
            const masterKey = await unwrapMasterKey(userData.wrappedMasterKey, passwordKEK);
            window.sessionEncryptionKey = masterKey;
          }

          console.log("Login successful");
          loggedIn.set(true);
      }
    } catch (err) {
      console.error(err);
      error = err.message;
      return;
    }
  }

  async function recoverWithSecurityAnswer() {
    if (!recoveryAnswer.trim()) {
      error = "Please provide an answer";
      return;
    }
    
    try {
      const userDoc = await getDoc(doc(db, 'users', pendingUserId));
      const userData = userDoc.data();
      
      const securityKEK = await deriveKeyFromSecurityAnswer(recoveryAnswer, pendingUserId);
      const masterKey = await unwrapMasterKey(userData.wrappedRecoveryKey, securityKEK);
      const newPasswordKEK = await deriveKeyFromPassword(pendingPassword, pendingUserId);
      const newWrappedMasterKey = await wrapMasterKey(masterKey, newPasswordKEK);
      
      await setDoc(doc(db, 'users', pendingUserId), {
        wrappedMasterKey: newWrappedMasterKey,
        timestamp: Date.now()
      }, { merge: true });
      
      window.sessionEncryptionKey = masterKey;
      
      showRecoveryPrompt = false;
      recoveryAnswer = "";
      userSecurityQuestion = "";
      pendingUserId = null;
      pendingPassword = null;
      error = "";
      
      console.log("Recovery successful. Master key re-encrypted");
      loggedIn.set(true);
      
    } catch (err) {
      console.error(err);
      error = "Incorrect answer. Please try again.";
    }
  }

  function cancelRecovery() {
    showRecoveryPrompt = false;
    recoveryAnswer = "";
    userSecurityQuestion = "";
    pendingUserId = null;
    pendingPassword = null;
    signOut(auth);
    error = "";
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


<!-- new account with email... setting up recovery -->
{#if showSecuritySetup}
<div class="overlay" style="z-index: 1000;" in:fade={{delay:0, duration:400, easing: cubicIn}}
                                            out:fade={{delay:0, duration:400, easing: cubicOut}}>
  <h2>Recovery Setup</h2>
  <p style="font-size: 10pt; width: 80vw">If you do not want to provide a recovery answer, please create an account without an email.</p>
  <br>
  <select bind:value={securityQuestion} class="login_input" style="width: 350px; padding: 0; margin:0">
    <option value="">Choose a security question</option>
    {#each availableQuestions as q}
      <option value={q}>{q}</option>
    {/each}
  </select>
  <br>
  <input type="text" placeholder="Your answer" bind:value={securityAnswer} class="login_input" style="width: 347px;"/>
  <br><br>
  <span>
    <button on:click={completeSignup}>Complete Signup</button>
    <button on:click={cancelSignup}>Cancel</button>
  </span>
  {#if error}
    <div class="login-hint"> {error}</div>
  {/if}
</div>
{/if}

<!-- authentication failed... recovering and reencrypting -->
{#if showRecoveryPrompt}
<div class="overlay" style="z-index: 1000;" in:fade={{delay:0, duration:400, easing: cubicIn}}
                                            out:fade={{delay:0, duration:400, easing: cubicOut}}>
  <h2>Account Recovery</h2>
  <p style="font-size: 10pt; width: 90vw">Your password was recently reset. Please answer your security question to recover your data.</p>
  <br>
  <p><i>{userSecurityQuestion}</i></p>
  <br>
  <input type="text" placeholder="Your answer" bind:value={recoveryAnswer} class="login_input" style="width: 347px;"/>
  <br><br>
  <span>
    <button on:click={recoverWithSecurityAnswer}>Recover Data</button>
    <button on:click={cancelRecovery}>Cancel</button>
  </span>
  {#if error}
   <div class="login-hint"> {error}</div>
  {/if}
  <br>
  <p style="font-size: 10pt; width: 90vw">
    If you cannot remember your answer, your data is unfortunately unrecoverable.
  </p>
</div>
{/if}

<!-- privacy pop-up -->
{#if privacyNotice}
<div class="overlay" style="z-index: 1000;">
  <h3>Privacy Notice</h3>
  <p style="font-size: 10pt; width: clamp(320px, 33vw, 33vw); text-align:justify">All personal data is locally encrypted using 256-bit AES-GCM before being sent to to Google Firebase. Importantly, I cannot see it, and neither can they!
  <br><br>For accounts that are setup without an email, your data will be unrecoverable if you forget your password. (Password resetting is not possible in this case.) For accounts that <i>are</i> setup with email, you will be asked to answer a security question on signup, which enables data recovery.
  <br><br>The diagram below details Good Calendar's mechanism for securing and recovering data. Elements in <span style="color: #d65c5c">red</span> are viewable by myself and the Firebase server and, together, cannot decrypt your data.
  </p><br>
  <div>
    <svg width="clamp(400px, 80vw, 60vw)" viewBox="25 80 792 282" font-weight="bold">
<text fill="#d65c5c" xml:space="preserve" transform="matrix(1 0 -0 1 .000061035159 612)" font-size="9.9626" font-family="Kp"><tspan y="-506.88" x="646.222 651.45236 656.1746 660.2194 665.38009 670.10238 674.14718 676.2991 682.96408 692.0898 697.00137 701.12588 704.6327 709.355 715.94027 722.86428 727.58657">Server&#x2019;sMasterKey</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="9.9626" font-family="Kp"><tspan y="-453.856" x="138.687 144.11663 149.02819 153.1527 157.2772 164.98827 170.22859 174.2734">Password</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="9.9626" font-family="Kp"><tspan y="-453.856" x="369.44 374.8696 379.78117 383.90568 388.03019 395.74125 400.98158 405.0264 413.48466 420.40864 425.1309">PasswordKey</tspan></text>
<text fill="#d65c5c" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="9.9626" font-family="Kp"><tspan y="-453.856" x="660.658 665.88839 670.61068 674.65548 679.8161 684.5384 688.5832 690.7351 697.4001 705.13107 709.97286 713.4797">Server&#x2019;sData</tspan></text>
<text fill="#d65c5c" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="9.9626" font-family="Kp"><tspan y="-397.882" x="142.323 149.79496 153.91947 158.64174 165.22702 168.82352">UserID</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="8.9664" font-family="Kp"><tspan y="-401.55" x="257.272 263.27949 267.69993 272.98115 278.3072 283.02354 290.89604 296.17726 300.4273 304.1394">Randomness</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="7.5716" font-family="Kp"><tspan y="-394.728" x="263.428 266.00993 269.99259 276.38304 279.51768 281.81187 285.83238 290.17848 294.69114 299.22654">(onsignup)</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="9.9626" font-family="Kp"><tspan y="-397.882" x="486.979 496.10475 501.0163 505.1408 508.64765 513.36996 519.9552 526.8792 531.6015">MasterKey</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .00005340576 612)" font-size="9.9626" font-family="Kp"><tspan y="-342.61" x="123.195 128.42537 133.14765 137.68064 143.61835 147.66316 150.68183 154.18866 161.96945 169.30193 175.16989 179.2944 186.91579 191.63806">SecurityAnswer</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .000061035159 612)" font-size="9.9626" font-family="Kp"><tspan y="-342.61" x="370.023 376.69795 381.4202 385.9532 391.1935 396.35417 401.07643 405.12126 412.90205 419.82603 424.54829">RecoveryKey</tspan></text>
<text fill="#5c5cd6" xml:space="preserve" transform="matrix(1 0 -0 1 .00012207031 612)" font-size="9.9626" font-family="Kp"><tspan y="-342.61" x="667.428 672.86758 678.1079 684.0456 690.63088 698.3618 703.2036 706.71047">YourData</tspan></text>
<text fill="#d65c5c" xml:space="preserve" transform="matrix(1 0 -0 1 .000061035159 612)" font-size="9.9626" font-family="Kp"><tspan y="-289.731" x="641.271 646.50137 651.22366 655.26846 660.4291 665.15139 669.19619 671.3481 678.01309 684.688 689.4103 693.94326 699.1836 704.34426 709.0665 713.1113 720.89218 727.81619 732.53848">Server&#x2019;sRecoveryKey</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M-245.70612 55.79094H-66.13823"/>
<path transform="matrix(1,0,0,-1,364.59785,155.65206)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-469.62" x="256.076 260.70268 264.95274 270.23396 274.484 278.07954 282.4372 285.59336 289.8434">generates</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="7.5716" font-family="Kp"><tspan y="-458.975" x="238.21099 242.79938 247.51648 252.93775 258.8133 263.05339 269.11067 273.16905 275.46324 281.12678 285.10188 291.12889 296.28514 299.0412 303.16773 307.29426">PBKDF2viaSHA-256</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M-113.06291-.18431H51.40237"/>
<path transform="matrix(1,0,0,-1,482.13844,211.6273)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M-51.51788-6.2008H-9.644501V5.83216H-51.51788Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 .000030517579 612)" font-size="8.9664" font-family="Kp"><tspan y="-398.902" x="381.166 385.79267 390.04273 395.32395 399.574 403.16954 407.5272 410.68336 414.9334">generates</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M94.93706 8.11462 97.05981 9.41722 97.54662 10.82631 100.50012 10.4179 101.47372 13.23608 104.42725 12.82767 105.40085 15.64586 108.35435 15.23746 109.32797 18.05562 112.28146 17.64722 113.25508 20.46541 116.2086 20.05699 117.18219 22.87518 120.13571 22.46677 121.10931 25.28496 124.06282 24.87656 125.03644 27.69473 127.98994 27.28633 128.96356 30.10452 131.91706 29.6961 132.89067 32.51428 135.8442 32.10587 136.81778 34.92406 139.7713 34.51566 140.7449 37.33383 143.69841 36.92543 144.67203 39.74362 147.62554 39.3352 148.59914 42.1534 151.55265 41.74498 152.52626 44.56316 155.47977 44.15475 156.45337 46.97293 159.40689 46.56453 160.3805 49.38272 163.334 48.9743 164.30762 51.7925 167.26113 51.38408 168.23473 54.20227 171.18824 53.79387 172.16185 56.61205 175.11536 56.20364 176.08896 59.02182 179.04248 58.6134 180.01607 61.4316 182.96959 61.02318 183.9432 63.84137 186.8967 63.43297 187.87032 66.25114 190.82382 65.84274 191.79744 68.66093 194.75095 68.25252 195.72455 71.0707 198.67807 70.66228 199.65166 73.48047 202.60518 73.07207 203.5788 75.89024 206.53229 75.48184 207.5059 78.30003 210.45941 77.89162 211.43302 80.70981 214.38654 80.30139 215.36014 83.11958 218.31365 82.71118 219.28725 85.52934 222.24077 85.12094 223.21439 87.93913 226.16788 87.53072 227.1415 90.3489 230.09502 89.94049 231.0686 92.75868 234.02213 92.35028 234.99573 95.16846 237.94924 94.76006 238.92284 97.57823 240.39962 97.37402 244.04094 99.60915"/>
<path transform="matrix(-.85231,.52295,.52295,.85231,525.2118,203.45862)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(.85223,-.52307,-.52307,-.85223,674.74026,111.70356)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M96.52023-9.38838 98.64764-10.68346 100.12367-10.47401 101.10727-13.28873 104.05936-12.86987 105.04297-15.68459 107.99506-15.26573 108.97867-18.08043 111.93074-17.66158 112.91435-20.4763 115.86644-20.05743 116.85007-22.87215 119.80215-22.45328 120.78575-25.268 123.73784-24.84915 124.72145-27.66385 127.67354-27.245 128.65715-30.05972 131.60924-29.64085 132.59284-32.45557 135.54492-32.0367 136.52854-34.85143 139.48062-34.43257 140.46424-37.24727 143.4163-36.82841 144.39992-39.64313 147.352-39.22427 148.33562-42.03899 151.2877-41.62012 152.2713-44.43484 155.22339-44.01598 156.20702-46.83069 159.1591-46.41183 160.14272-49.22655 163.0948-48.8077 164.0784-51.6224 167.03049-51.20354 168.0141-54.01826 170.96619-53.5994 171.9498-56.41411 174.90187-55.99525 175.88549-58.80997 178.83757-58.39111 179.82118-61.20581 182.77327-60.78696 183.75687-63.60168 186.70896-63.18282 187.69257-65.99753 190.64466-65.57867 191.62827-68.39339 194.58036-67.97453 195.56397-70.78923 198.51605-70.37038 199.49967-73.1851 202.45175-72.76624 203.43537-75.58095 206.38744-75.16208 207.37105-77.9768 210.32314-77.55795 211.30675-80.37265 214.25884-79.9538 215.24243-82.76852 218.19452-82.34966 219.17813-85.16437 222.13022-84.7455 223.11383-87.56023 226.06592-87.14137 227.04952-89.95607 230.0016-89.53722 230.98522-92.35193 233.9373-91.93307 234.92093-94.74779 237.873-94.32892 238.85662-97.14365 241.8087-96.72478 242.3005-98.13214 244.72724-99.6106"/>
<path transform="matrix(-.85414,-.51993,-.51993,.85414,526.7945,220.70189)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(.85397,.52022,.52022,-.85397,675.42697,311.18318)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M-230.21404-55.45715H-65.55542"/>
<path transform="matrix(1,0,0,-1,365.18067,266.90016)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-337.364" x="264.113 268.7397 272.98976 278.27098 282.52104 286.11656 290.4742 293.63038 297.88044">generates</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="7.5716" font-family="Kp"><tspan y="-326.71903" x="246.248 250.8364 255.5535 260.97477 266.8503 271.0904 277.14768 281.20606 283.50025 289.1638 293.1389 299.1659 304.32215 307.07823 311.20475 315.33128">PBKDF2viaSHA-256</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M259.04124-46.92056V-44.42987L258.0948-43.27792 259.9877-40.97403 258.0948-38.67015 259.9877-36.36626 258.0948-34.06236 259.9877-31.75847 258.0948-29.45459 259.9877-27.1507 258.0948-24.8468 259.9877-22.54291 258.0948-20.23903 259.9877-17.93513 258.0948-15.63124 259.9877-13.32735 258.0948-11.02347 259.9877-8.71957 258.0948-6.41568 259.9877-4.11179 258.0948-1.8079 259.9877 .49597 258.0948 2.79987 259.9877 5.10376 258.0948 7.40764 259.9877 9.71153 258.0948 12.01543 259.9877 14.31932 258.0948 16.6232 259.9877 18.9271 258.0948 21.23099 259.9877 23.53488 258.0948 25.83876 259.9877 28.14265 258.0948 30.44655 259.9877 32.75044 258.0948 35.05432 259.9877 37.35822 258.0948 39.66211 259.9877 41.966 258.0948 44.26988 259.04124 45.42183V48.62921"/>
<path transform="matrix(0,1,1,0,689.5282,258.6126)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(0,-1,-1,-0,689.5282,162.56472)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="var(--V-medium-text)" d="M-2.5903 2.98882C-2.11707 1.1955-1.06248 .34868 0 0-1.06248-.34868-2.11707-1.1955-2.5903-2.98882"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M4.4777 61.42294C39.5597 67.06998 99.57834 66.49132 168.7418 53.99678"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M22.62114 53.71736H125.0372V75.30849H22.62114Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-467.216" x="460.286 464.53608 469.8173 473.897 477.53736 482.2537 487.62458 490.78074 496.77928 501.1997 506.48094 514.0934 519.41946 523.6695 527.7492 531.3896 536.1059 541.47677 544.63296">encryptsanddecrypts</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="7.5716" font-family="Kp"><tspan y="-456.652" x="486.885 492.4577 497.05366 501.02876 503.78483 509.5165 514.809">AES-GCM</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M-258.8948 7.85413C-233.27727 24.7853-198.6652 41.5772-156.42032 55.54402"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M-238.33768 22.47188H-209.51052V33.39301H-238.33768Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-425.301" x="194.349 198.76944 204.76798 208.48007 212.90052 215.62631">assalt</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M-260.10447-6.8479C-230.2983-24.98552-193.27509-41.56668-148.38288-55.22986"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M-235.24535-33.23903H-206.41819V-22.317898H-235.24535Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-369.591" x="197.441 201.86144 207.85997 211.57207 215.99251 218.7183">assalt</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M110.96405-2.472 258.30839-1.61024"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M133.42818-12.8367H235.84424V8.754429H133.42818Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-400.663" x="571.091 575.34109 580.62228 584.70199 588.34237 593.05868 598.4295 601.5857 607.5842 612.00466 617.2858 624.8983 630.22439 634.4744 638.55416 642.1945 646.9108 652.2817 655.43789">encryptsanddecrypts</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="7.5716" font-family="Kp"><tspan y="-390.099" x="597.691 603.2637 607.8596 611.8347 614.59078 620.32247 625.615">AES-GCM</tspan></text>
<path transform="matrix(1,0,0,-1,430.487,211.443)" stroke-width="1" stroke-linecap="butt" stroke-miterlimit="10" stroke-linejoin="miter" fill="none" stroke="var(--V-medium-text)" d="M3.8949-61.1381C39.89847-67.07677 100.25749-66.78949 169.8765-54.62994"/>
<path transform="matrix(1,0,0,-1,430.487,211.443)" d="M23.07187-75.46638H125.48793V-53.875249H23.07187Z" fill="var(--V-background-white)"/>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="8.9664" font-family="Kp"><tspan y="-338.034" x="460.736 464.98606 470.26728 474.347 477.98735 482.70368 488.07456 491.2307 497.22926 501.6497 506.9309 514.5434 519.86947 524.1195 528.1992 531.8396 536.5559 541.92678 545.08297">encryptsanddecrypts</tspan></text>
<text fill="var(--V-medium-text)" xml:space="preserve" transform="matrix(1 0 -0 1 0 612)" font-size="7.5716" font-family="Kp"><tspan y="-327.47" x="487.336 492.9087 497.50465 501.47975 504.2358 509.9675 515.26">AES-GCM</tspan></text>
</svg>
</div>
  <p style="font-size: 10pt; width: clamp(320px, 33vw, 33vw); text-align:justify">The code for this project is avalible on GitHub. Feel free to email for suggestions, errors, and improvements <a href="https://github.com/hayekn/goodcalendar" target="_blank"><svg height="12pt" style="transform:translateY(3px); margin-left: 2px" viewBox="0 0 448 512"><!--!Font Awesome Free v5.15.4 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path fill=var(--V-medium-text) d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zM277.3 415.7c-8.4 1.5-11.5-3.7-11.5-8 0-5.4.2-33 .2-55.3 0-15.6-5.2-25.5-11.3-30.7 37-4.1 76-9.2 76-73.1 0-18.2-6.5-27.3-17.1-39 1.7-4.3 7.4-22-1.7-45-13.9-4.3-45.7 17.9-45.7 17.9-13.2-3.7-27.5-5.6-41.6-5.6-14.1 0-28.4 1.9-41.6 5.6 0 0-31.8-22.2-45.7-17.9-9.1 22.9-3.5 40.6-1.7 45-10.6 11.7-15.6 20.8-15.6 39 0 63.6 37.3 69 74.3 73.1-4.8 4.3-9.1 11.7-10.6 22.3-9.5 4.3-33.8 11.7-48.3-13.9-9.1-15.8-25.5-17.1-25.5-17.1-16.2-.2-1.1 10.2-1.1 10.2 10.8 5 18.4 24.2 18.4 24.2 9.7 29.7 56.1 19.7 56.1 19.7 0 13.9.2 36.5.2 40.6 0 4.3-3 9.5-11.5 8-66-22.1-112.2-84.9-112.2-158.3 0-91.8 70.2-161.5 162-161.5S388 165.6 388 257.4c.1 73.4-44.7 136.3-110.7 158.3zm-98.1-61.1c-1.9.4-3.7-.4-3.9-1.7-.2-1.5 1.1-2.8 3-3.2 1.9-.2 3.7.6 3.9 1.9.3 1.3-1 2.6-3 3zm-9.5-.9c0 1.3-1.5 2.4-3.5 2.4-2.2.2-3.7-.9-3.7-2.4 0-1.3 1.5-2.4 3.5-2.4 1.9-.2 3.7.9 3.7 2.4zm-13.7-1.1c-.4 1.3-2.4 1.9-4.1 1.3-1.9-.4-3.2-1.9-2.8-3.2.4-1.3 2.4-1.9 4.1-1.5 2 .6 3.3 2.1 2.8 3.4zm-12.3-5.4c-.9 1.1-2.8.9-4.3-.6-1.5-1.3-1.9-3.2-.9-4.1.9-1.1 2.8-.9 4.3.6 1.3 1.3 1.8 3.3.9 4.1zm-9.1-9.1c-.9.6-2.6 0-3.7-1.5s-1.1-3.2 0-3.9c1.1-.9 2.8-.2 3.7 1.3 1.1 1.5 1.1 3.3 0 4.1zm-6.5-9.7c-.9.9-2.4.4-3.5-.6-1.1-1.3-1.3-2.8-.4-3.5.9-.9 2.4-.4 3.5.6 1.1 1.3 1.3 2.8.4 3.5zm-6.7-7.4c-.4.9-1.7 1.1-2.8.4-1.3-.6-1.9-1.7-1.5-2.6.4-.6 1.5-.9 2.8-.4 1.3.7 1.9 1.8 1.5 2.6z"/></svg></a>
  </p><br>
  <button on:click={() => {privacyNotice=!privacyNotice}}>Return</button>
</div>
{/if}

<!-- main login -->
{#if (!showSecuritySetup && !showRecoveryPrompt)}
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
        disabled={showSecuritySetup || showRecoveryPrompt}
      />
      <div style="display: flex; align-items: center; position: relative;">
        <input
          type={passType ? "password" : "text"}
          placeholder="Password"
          class="login_input"
          bind:value={password}
          style="width: 200px;"
          disabled={showSecuritySetup || showRecoveryPrompt}
        />
        <button on:click={() => (passType = !passType)} class="login-show-password">
          {passType ? "show" : "hide"}
        </button>
      </div>
    </div>
  </div>
  <div style="position:relative">
    <div style="text-align:center">
      <button on:click={login} style="font-size:11pt;" 
              disabled={showSecuritySetup || showRecoveryPrompt}>
        Login
      </button>
      <button on:click={signup} style="font-size:11pt;" 
              disabled={showSecuritySetup || showRecoveryPrompt}>
        Sign up
      </button>
    </div>
    <div style="margin-top: 5px; text-align:center">
      <button on:click={resetPassword} style="font-size:11pt;" 
              disabled={showSecuritySetup || showRecoveryPrompt}>
        Forgot Password
      </button>
    </div>
        <!-- <button on:click={loginAnon}>login anonymous</button> -->
  </div>
  <div class="login-hint">
  {#if error && !showRecoveryPrompt && !showSecuritySetup}
      {errorParser(error)}
  {/if}
  </div>
  <p style="text-align: center; width: clamp(350px, 45vw, 45vw); color: var(--V-medium-text); font-size: 12pt">
    Track the quality of your days and nights using color-coded ratings and comments. Dedicated to my girlfriend and her chronic migranes. All data is encrypted and private. 
  </p>
  <p style="text-align: center; max-width: 550px; color: var(--V-medium-text); font-size: 9pt">
    For demo, username and password: <span style="text-decoration:underline">goodcalendar</span>
  </p>

  <!-- button row -->
  <span> 
    <a href="https://nicholashayek.com/" style="margin: 0; padding: 0px 10px">
      <svg height="25px" viewBox="0 0 576 512"><path fill="var(--V-medium-text)" d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/></svg>
    </a>         
    <button style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 10px" on:click={darkMode}>
      <svg height="25px" viewBox="0 0 512 512"><path fill="var(--V-medium-text)" d="M283.211 512c78.962 0 151.079-35.925 198.857-94.792 7.068-8.708-.639-21.43-11.562-19.35-124.203 23.654-238.262-71.576-238.262-196.954 0-72.222 38.662-138.635 101.498-174.394 9.686-5.512 7.25-20.197-3.756-22.23A258.156 258.156 0 0 0 283.211 0c-141.309 0-256 114.511-256 256 0 141.309 114.511 256 256 256z"/></svg>
    </button>
    <button style="background-color: rgb(0, 0, 0, 0); margin: 0; padding: 0px 10px" on:click={() => {privacyNotice = !privacyNotice}}>
      <svg height="25px" viewBox="0 0 448 512"><path fill="var(--V-medium-text)" d="M383.9 308.3l23.9-62.6c4-10.5-3.7-21.7-15-21.7h-58.5c11-18.9 17.8-40.6 17.8-64v-.3c39.2-7.8 64-19.1 64-31.7 0-13.3-27.3-25.1-70.1-33-9.2-32.8-27-65.8-40.6-82.8-9.5-11.9-25.9-15.6-39.5-8.8l-27.6 13.8c-9 4.5-19.6 4.5-28.6 0L182.1 3.4c-13.6-6.8-30-3.1-39.5 8.8-13.5 17-31.4 50-40.6 82.8-42.7 7.9-70 19.7-70 33 0 12.6 24.8 23.9 64 31.7v.3c0 23.4 6.8 45.1 17.8 64H56.3c-11.5 0-19.2 11.7-14.7 22.3l25.8 60.2C27.3 329.8 0 372.7 0 422.4v44.8C0 491.9 20.1 512 44.8 512h358.4c24.7 0 44.8-20.1 44.8-44.8v-44.8c0-48.4-25.8-90.4-64.1-114.1zM176 480l-41.6-192 49.6 32 24 40-32 120zm96 0l-32-120 24-40 49.6-32L272 480zm41.7-298.5c-3.9 11.9-7 24.6-16.5 33.4-10.1 9.3-48 22.4-64-25-2.8-8.4-15.4-8.4-18.3 0-17 50.2-56 32.4-64 25-9.5-8.8-12.7-21.5-16.5-33.4-.8-2.5-6.3-5.7-6.3-5.8v-10.8c28.3 3.6 61 5.8 96 5.8s67.7-2.1 96-5.8v10.8c-.1.1-5.6 3.2-6.4 5.8z"/></svg>
    </button>
  </span>
</div>
{/if}