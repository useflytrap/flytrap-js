<script setup>
let text = ''

function onSubmit() {
  if (text === 'wrong') {
    throw new Error(`Input value "${text}"`)
  }
}
</script>

<template>
  <div>
    <!--<NuxtWelcome />-->

    <input v-model="text" placeholder="don't write wrong, or else!" />
    <button @click="onSubmit">Submit</button>
  </div>
</template>
