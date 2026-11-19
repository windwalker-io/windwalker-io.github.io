---
layout: page
title: Documentation
description: Redirects to the Windwalker components documentation.
head:
  - - meta
    - http-equiv: refresh
      content: 0; url=/documentation/components/
---
<script setup>
import { inBrowser } from 'vitepress';

if (inBrowser) {
  window.location.replace('/documentation/components/');
}
</script>

Redirecting to [Components](/documentation/components/)...
