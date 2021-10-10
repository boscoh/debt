<template lang="pug">
.border.p-1.mt-2
    .d-flex.flex-row.align-items-center(style="width: auto")
        .dropdown
            button.btn.btn-primary.dropdown-toggle(
                type="button"
                data-bs-toggle="dropdown"
            ) Countries
            ul.dropdown-menu
                li
                    router-link.dropdown-item(
                        v-for="(item, i) in items"
                        :to="item.to"
                    )
                        | {{ item.title }}
        .ms-2 Select a country for a detailed breakdown
</template>

<script>
import models from '../countries/index'

let items = [{ to: '/', title: 'International Comparisons' }]
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
