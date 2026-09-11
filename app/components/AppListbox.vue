<script setup lang="ts">
import { UI_RISE_TRANSITION } from '~/utils/uiMotion'

const props = defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string }>
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const menuRef = ref<HTMLElement | null>(null)
const listId = useId()
const activeIndex = ref(0)
const menuMinWidth = ref('11.25rem')

const selectedIndex = computed(() => {
  const index = props.options.findIndex(
    (option) => option.value === props.modelValue,
  )
  return index < 0 ? 0 : index
})

const selectedLabel = computed(
  () => props.options[selectedIndex.value]?.label ?? '',
)

function optionId(index: number) {
  return `${listId}-opt-${index}`
}

function openMenu() {
  const width = triggerRef.value?.offsetWidth
  if (width) {
    menuMinWidth.value = `${width}px`
  }
  activeIndex.value = selectedIndex.value
  open.value = true
  void nextTick(() => {
    menuRef.value?.focus()
  })
}

function closeMenu(restoreFocus = true) {
  if (!open.value) {
    return
  }
  open.value = false
  if (restoreFocus) {
    triggerRef.value?.focus()
  }
}

function toggle() {
  if (open.value) {
    closeMenu()
  } else {
    openMenu()
  }
}

function selectIndex(index: number) {
  const option = props.options[index]
  if (!option) {
    return
  }
  emit('update:modelValue', option.value)
  closeMenu()
}

function moveActive(delta: number) {
  const last = props.options.length - 1
  if (last < 0) {
    return
  }
  activeIndex.value = Math.min(last, Math.max(0, activeIndex.value + delta))
}

function onTriggerKey(event: KeyboardEvent) {
  if (
    event.key === 'ArrowDown' ||
    event.key === 'ArrowUp' ||
    event.key === 'Enter' ||
    event.key === ' '
  ) {
    event.preventDefault()
    openMenu()
  }
}

function onMenuKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    closeMenu()
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }
  if (event.key === 'Home') {
    event.preventDefault()
    activeIndex.value = 0
    return
  }
  if (event.key === 'End') {
    event.preventDefault()
    activeIndex.value = Math.max(0, props.options.length - 1)
    return
  }
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    selectIndex(activeIndex.value)
  }
}

function onMenuFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (
    next instanceof Node &&
    (triggerRef.value?.contains(next) || menuRef.value?.contains(next))
  ) {
    return
  }
  closeMenu(false)
}

onClickOutside(
  triggerRef,
  () => {
    closeMenu(false)
  },
  { ignore: [menuRef] },
)
</script>

<template>
  <div class="app-listbox">
    <button
      ref="triggerRef"
      type="button"
      class="app-listbox__trigger ui-press"
      :aria-label="label"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="toggle"
      @keydown="onTriggerKey"
    >
      <span class="app-listbox__value">{{ selectedLabel }}</span>
      <Icon
        name="lucide:chevron-down"
        class="app-listbox__chevron"
        aria-hidden="true"
      />
    </button>
    <Teleport to="body">
      <Transition :name="UI_RISE_TRANSITION">
        <AppFloatRoot
          v-if="open"
          :anchor-el="triggerRef"
          :interactive="true"
          :z-index="70"
          :gap="4"
          :prefer-above-min="10000"
          align="end"
          :style="{ minWidth: menuMinWidth }"
          surface-class="app-listbox__menu"
        >
          <ul
            :id="listId"
            ref="menuRef"
            class="app-listbox__list"
            role="listbox"
            tabindex="0"
            :aria-label="label"
            :aria-activedescendant="optionId(activeIndex)"
            @keydown="onMenuKey"
            @focusout="onMenuFocusOut"
          >
            <li
              v-for="(option, index) in options"
              :id="optionId(index)"
              :key="option.value"
              role="option"
              class="app-listbox__option ui-press-row"
              :class="{
                'is-selected': option.value === modelValue,
                'is-active': index === activeIndex,
              }"
              :aria-selected="option.value === modelValue"
              @pointerenter="activeIndex = index"
              @click="selectIndex(index)"
            >
              <span>{{ option.label }}</span>
              <Icon
                v-if="option.value === modelValue"
                name="lucide:check"
                class="app-listbox__check"
                aria-hidden="true"
              />
            </li>
          </ul>
        </AppFloatRoot>
      </Transition>
    </Teleport>
  </div>
</template>
