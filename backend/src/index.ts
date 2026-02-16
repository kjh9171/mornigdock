import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('/*', cors())

app.get('/', (c) => {
  return c.json({ message: 'Welcome to Agora Global Platform API' })
})

// Mock Data Route
app.get('/api/news', (c) => {
  return c.json([
    { id: 1, title: { ko: '아고라 프로젝트 시작', en: 'Agora Project Started' }, summary: { ko: '글로벌 플랫폼 구축을 위한 첫 걸음', en: 'First step for Global Platform' } },
    { id: 2, title: { ko: '차세대 보안 시스템', en: 'Next-Gen Security System' }, summary: { ko: '이메일 해시 추적 기술 도입', en: 'Email Hash Tracking Tech Introduced' } },
    { id: 3, title: { ko: '디자인 혁신', en: 'Design Innovation' }, summary: { ko: '미니멀리즘과 정보 밀도의 조화', en: 'Harmony of Minimalism and Info Density' } },
    { id: 4, title: { ko: '글로벌 대응 완료', en: 'Global Support Ready' }, summary: { ko: 'i18next 기반 다국어 지원', en: 'i18next based Multilingual Support' } },
    { id: 5, title: { ko: '관리자 기능 강화', en: 'Admin Feature Enhanced' }, summary: { ko: '실시간 로그 추적 및 통제권', en: 'Real-time Log Tracking & Control' } }
  ])
})

const port = 8787
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port
})
