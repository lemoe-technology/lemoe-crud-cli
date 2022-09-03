<template>
  <le-view
    :list="list"
    :query="query"
    :sort="sort"
    :pagination="pagination"
    :selection="selection"
    :structure="reactiveStructure"
    @operate="handleOperate"
  />
</template>

<script setup>
import { useView, LeView } from 'lemoe-admin';

import structure from '../structure';
import Description from './description.vue';
import Form from './form.vue';

const {
  structure: reactiveStructure,
  list,
  query,
  sort,
  pagination,
  selection,
  handleOperate,
} = useView(structure, {
  content: {
    store: {
      content: Form,
    },
    show: {
      content: Description,
    },
    update: {
      content: Form,
    },
  },
});
</script>
