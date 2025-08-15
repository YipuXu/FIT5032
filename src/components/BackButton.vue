<script setup>
defineOptions({ name: 'BackButton' })
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  variant: {
    type: String,
    default: 'outline-secondary',
  },
  size: {
    type: String,
    default: '',
  },
  offsetY: {
    type: String,
    default: '2px',
  },
})

function goBack() {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push({ name: 'home' })
  }
}
</script>

<template>
  <button
    :class="[
      'btn',
      `btn-${variant}`,
      size ? `btn-${size}` : '',
      'd-flex',
      'align-items-center',
      'mm-back-btn',
    ]"
    :style="{ transform: `translateY(${offsetY})` }"
    @click="goBack"
    aria-label="Go back"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      viewBox="0 0 16 16"
      class="me-1"
    >
      <path
        fill-rule="evenodd"
        d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z"
      />
    </svg>
    <span class="mm-back-btn__text"><slot>Back</slot></span>
  </button>
</template>

<style scoped>
/* Pill-shaped back button matching site theme */
.mm-back-btn {
  border-radius: 25px; /* pill */
  padding: 6px 6px; /* narrower horizontally */
  gap: 0px;
  min-height: 30px;
  box-shadow: 0 2px 6px rgba(52, 78, 65, 0.08);
  background: var(--mm-paper, #fff);
  color: var(--mm-forest, #344e41);
  border: 1px solid var(--mm-olive, #a3b18a);
  transition:
    transform 200ms ease,
    box-shadow 200ms ease,
    background-color 200ms ease,
    color 200ms ease;
  align-self: center; /* center vertically within the header row */
  font-size: 0.95rem;
}

.mm-back-btn svg {
  transition:
    transform 220ms cubic-bezier(0.4, 0, 0.2, 1),
    fill 220ms ease;
  width: 14px;
  height: 14px;
}

.mm-back-btn:hover {
  /* on hover: shift gently to the left while keeping vertical alignment */
  transform: translateX(-8px);
  box-shadow: 0 8px 20px rgba(52, 78, 65, 0.14);
  background: var(--mm-olive, #a3b18a);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.08);
}

.mm-back-btn:hover svg {
  transform: translateX(-2px);
}

.mm-back-btn:focus {
  outline: none;
  box-shadow: 0 6px 18px rgba(88, 129, 87, 0.18);
}

.mm-back-btn .me-2 {
  display: inline-flex;
  align-items: center;
  margin-right: 6px; /* ensure smaller gap between icon and text */
}

.mm-back-btn__text {
  transform: translateY(-1px); /* nudge text up slightly */
}

/* size variants keep compatibility with bootstrap btn-sm/btn-lg */
.btn-sm.mm-back-btn {
  padding: 6px 10px;
  border-radius: 20px;
}
.btn-lg.mm-back-btn {
  padding: 12px 18px;
  border-radius: 28px;
}
</style>
