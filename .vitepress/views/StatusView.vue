<script setup>
import { componentNames } from '../data/menu/components.menu';

</script>

<template>
  <div class="py-5" style="width: 100%">
    <header class="mb-5">
      <h2>Status</h2>
    </header>
    <table class="table table-bordered table-striped" style="width: 100%">
      <thead style="width: 100%">
      <tr>
        <th>Component</th>
        <th class="text-end">Status</th>
      </tr>
      </thead>
      <tbody>
      <tr v-for="component of componentNames">
        <td class="text-nowrap">
          <a class="font-monospace"
              :href="`https://github.com/windwalker-io/${component}`"
              style="text-decoration: none;"
              target="_blank"
          >
            windwalker/{{ component }}
          </a>
        </td>
        <td class="text-end text-nowrap" style="">
          <div class="c-badges">
            <a :href="`https://packagist.org/packages/windwalker/${component}`"
                target="_blank" style="text-decoration: none">
              <img alt="Packagist Version" :src="`https://img.shields.io/packagist/v/windwalker/${component}?style=flat-square`">
            </a>
            <a :href="`https://github.com/windwalker-io/${component}`"
                target="_blank" style="text-decoration: none">
              <img alt="GitHub" :src="`https://img.shields.io/github/license/windwalker-io/${component}?style=flat-square`">
            </a>
            <a :href="`https://github.com/windwalker-io/${component}/actions`"
                target="_blank" style="text-decoration: none">
              <img alt="GitHub Workflow Status" :src="`https://img.shields.io/github/actions/workflow/status/windwalker-io/${component}/ci.yml?label=test&style=flat-square`">
            </a>
            <a :href="`https://packagist.org/packages/windwalker/${component}/stats`"
                target="_blank" style="text-decoration: none">
              <img alt="Packagist Downloads" :src="`https://img.shields.io/packagist/dt/windwalker/${component}?style=flat-square`">
            </a>
          </div>
        </td>
      </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.c-badges {
  white-space: nowrap;
  display: flex;
  gap: .25rem;
}
</style>
