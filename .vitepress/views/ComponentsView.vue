<script setup>
import { kebabCase } from 'lodash-es';
import { groupedComponents } from '../data/menu/components.menu';
</script>

<template>
  <div>
    <div>
      <section v-for="(components, section) of groupedComponents"
          class="l-section mb-5"
        :class="`l-section--${kebabCase(section)}`">
        <h3>{{ section }}</h3>

        <div class="items">
          <div v-for="(component, alias) of components" class="item grid-3 c-card c-card--component">
            <div class="card h-100 shadow-sm">
              <div class="card-body">
                <div class="c-card__top">
                  <span class="font-monospace" style="color: var(--bs-success)">
                      windwalker/{{ alias }}
                  </span>
                  <span v-if="component.extra?.wip"
                      class="ms-auto badge border border-secondary text-secondary">WIP</span>
                </div>
                <h5 class="card-title c-card__title">
                  <a class="link-primary stretched-link"
                      style="text-decoration: none;"
                      :style="[ component.extra?.wip ? 'pointer-events: none;' : '' ]"
                      :href="`/documentation/components/${alias}/`">
                    {{ component.title }}
                  </a>
                </h5>
                <div class="c-card__desc text-muted">
                  {{ component.description }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<style scoped>
h3 {
  margin-bottom: 1rem;
}

.c-card--component {
  border: 1px solid var(--vp-c-bg-soft);
  border-radius: 12px;
  height: 100%;
  background-color: var(--vp-c-bg-soft);
  position: relative;
  transition: all .3s;

  &:hover {
    background-color: color-mix(in srgb, var(--vp-c-bg-soft) 99%, white);
  }
}

.c-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: .875rem;
}

.c-card__title {
  position: static;
}

.c-card__title a::after {
  content: "";
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.c-card__desc {
  font-size: .9375rem;
  color: var(--vp-c-default-1);
}

.items {
  display: grid;
  column-count: 3;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.item {
  padding: .75rem;
  width: 100%;
}
</style>
