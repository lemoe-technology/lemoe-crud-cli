<template>
  <le-description :item="item" :structure="reactiveStructure" />
</template>

<script setup>
import { useDescription, LeDescription } from 'lemoe-admin';

import structure from '../structure';

const { structure: reactiveStructure, item } = useDescription(
  structure,
  props.id
);

const props = defineProps({
  id: {
    type: Number,
    required: true,
  },
});
</script>
