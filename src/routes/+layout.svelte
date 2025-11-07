<script>
	import favicon from '$lib/assets/dice.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Good Calendar</title>
</svelte:head>

{@render children()}
