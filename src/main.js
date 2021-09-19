import { createApp } from 'vue'
import App from './App.vue'
import * as VueRouter from 'vue-router'
import Country from './components/Country.vue'
import Home from './components/Home.vue'
import countryPageLayouts from './countries/index'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
]

for (let c of countryPageLayouts) {
    routes.push({
        path: c.path,
        name: c.name,
        component: Country,
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
