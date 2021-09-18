import { createApp } from 'vue'
import App from './App.vue'
import * as VueRouter from 'vue-router'
import PopModel from './components/Country.vue'
import Home from './components/Home.vue'
import models from './countries/index'

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home,
    },
]

for (let m of models) {
    routes.push({
        path: m.path,
        name: m.name,
        component: PopModel,
        props: { name: m.name },
    })
}

const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
})

const app = createApp(App)

app.use(router)

app.mount('#app')
