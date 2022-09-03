<template>
  <le-container
    medium="paper"
    :title="`查看${structure.title}`"
    :content="View"
  />
</template>

<script setup>
import { LeContainer } from 'lemoe-admin';

import View from './components/view.vue';
import structure from './structure';
</script>
