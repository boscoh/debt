<template lang="pug">
.dropdown
    button.btn.btn-secondary.dropdown-toggle(
        type="button"
        data-bs-toggle="dropdown"
    ) Countries
    ul.dropdown-menu
        li
            router-link.dropdown-item(
                v-for="(item, i) in items"
                :to="item.to"
            ) {{ item.title }}
</template>

<script>
import models from '../countries/index'

let items = [{ to: '/', title: 'Home' }]
for (let m of models) {
    items.push({ to: m.path, title: m.name })
}

console.log(items)

export default {
    name: 'DropModelMenu',
    data () {
        return { items }
    },
}
</script>
