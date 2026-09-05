
<script setup>
defineProps({ message: String });
</script>

<template>
  <div v-if="message" class="toast" role="alert" aria-live="assertive">{{ message }}</div>
</template>
