<template lang="pug">
.d-flex.flex-column.h-100
    .p-4.text-start
        h1.m-0 Data Visualisation of National Debt
        .d-flex.flex-row.flex-wrap
            .me-3
                = "Data: "
                a(href="https://www.bis.org/statistics/totcredit.htm?m=6%7C380%7C669")
                    | Bank of International Settlement
            .me-3
                = "Source: "
                a(href="https://github.com/boscoh/debt")
                    | github/boscoh/debt
            .me-3
                = "Design: "
                a(href="https://boscoh.com")
                    | Bosco Ho
        model-menu.mt-1
    router-view(:key="$route.fullPath")
</template>

<script setup>
import modelMenu from './components/DropdownMenu.vue'
document.title = 'Data Visualisation of National Debt'
</script>

<style>
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-align: center;
    color: #2c3e50;
}
</style>
