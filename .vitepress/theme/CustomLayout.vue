<script setup>
import { useData, withBase } from 'vitepress';
import DefaultTheme from 'vitepress/theme';
import { computed } from 'vue';
import { flatComponents } from '../data/components';
import { componentRoutePrefix } from '../store/routing-store';
import icon from '../../public/images/logo-icon.png';
// import { register } from 'swiper/element/bundle';
// register();

const { Layout } = DefaultTheme;
const data = useData();
const { page } = useData();

const componentAlias = computed(() => page.value.frontmatter.component || '');
const component = computed(() => flatComponents.value.find((com) => com.alias === componentAlias.value));
const isComponent = computed(() => !!page.value.frontmatter.component);

</script>

<template>
<Layout>
  <template #home-features-after>
<!--    <section class="container l-section l-section&#45;&#45;start my-7">-->
<!--      <h2 class="l-section__title"-->
<!--          style="font-size: 2rem; text-align: center"-->
<!--      >GETTING STARTED</h2>-->

<!--      <div class="mt-4 row justify-content-center">-->
<!--        <div class="col-lg-6 col-md-8">-->
<!--          <pre><code class="language-bash">$ composer create-project windwalker/starter</code></pre>-->
<!--        </div>-->
<!--      </div>-->

<!--      <div class="mt-4 text-center">-->
<!--        <a class="btn btn-primary btn-lg"-->
<!--            href="{{ $uri->path('documentation') }}">-->
<!--          <i class="fa-solid fa-file-lines"></i>-->
<!--          Documentation-->
<!--        </a>-->
<!--      </div>-->
<!--    </section>-->
  </template>


  <template #doc-before>
    <div v-if="isComponent" class="c-card" style="margin-bottom: 2rem; padding: 1.5rem; ">
      <div style="display: flex; gap: .5rem; margin-bottom: .5rem; align-items: center">
        <img :src="icon"
            style="height: 30px"
            alt="Windwalker">
        <a :href="`/${componentRoutePrefix}/${component.alias}/`">
          <h2 style="font-size: 1.5rem;">{{ component.title }}</h2>
        </a>
        <div style="opacity: .6">Component</div>
        <a :href="`https://github.com/windwalker-io/${component.alias}`"
            target="_blank"
            rel="noopener"
            class="github-link"
            style="margin-left: auto; display: flex; align-items: center; gap: .3rem; opacity: .6; text-decoration: none"
            :title="`windwalker-io/${component.alias} on GitHub`">
          <svg viewBox="0 0 16 16" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          <span style="font-size: .9rem">{{ component.alias }}</span>
        </a>
      </div>
      <div style="opacity: .4">
        {{ component.description }}
      </div>
    </div>
  </template>
</Layout>
</template>

<style scoped>

</style>
