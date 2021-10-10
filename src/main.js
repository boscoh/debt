import { createApp } from 'vue'
import App from './App.vue'
import * as VueRouter from 'vue-router'
import CountryCharts from './components/CountryCharts.vue'
import Home from './components/Home.vue'
import countryLayouts from './countries/index'

const routes = [
    {
        path: '/',
        component: Home,
    },
]

for (let c of countryLayouts) {
    routes.push({
        path: c.path,
        component: CountryCharts,
        props: { name: c.name },
    })
}

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
})

const app = createApp(App)

app.use(router)

app.mount('#app')
