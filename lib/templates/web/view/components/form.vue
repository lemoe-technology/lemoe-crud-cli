<template>
  <le-form
    :is-new="isNew"
    :item="item"
    :structure="reactiveStructure"
    @save="handleSave"
  />
</template>

<script setup>
import { useForm, LeForm } from 'lemoe-admin';

import structure from '../structure';

const {
  structure: reactiveStructure,
  isNew,
  item,
  handleSave,
} = useForm(structure, props.id);

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
});
</script>
