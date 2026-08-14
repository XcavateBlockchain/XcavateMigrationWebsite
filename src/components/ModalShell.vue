<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'

const props = withDefaults(
  defineProps<{
    labelledBy: string
    /** A sign request in flight must not be dismissed out from under the wallet. */
    dismissible?: boolean
  }>(),
  { dismissible: true },
)

const emit = defineEmits<{ close: [] }>()

function requestClose() {
  if (props.dismissible) emit('close')
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') requestClose()
}

onMounted(() => document.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="modal" role="dialog" aria-modal="true" :aria-labelledby="labelledBy" @click.self="requestClose">
    <div class="modal__panel">
      <slot />
    </div>
  </div>
</template>
