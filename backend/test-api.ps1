# Script de Testes - API Backend Supabase
# Execute: .\test-api.ps1

Write-Host "`n🧪 TESTANDO API BACKEND`n" -ForegroundColor Cyan

# 1. Health Check
Write-Host "1️⃣ Health Check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
Write-Host "✅ " -NoNewline -ForegroundColor Green
Write-Host $health.message

# 2. Login
Write-Host "`n2️⃣ Login (admin@test.com)..." -ForegroundColor Yellow
$loginBody = @{
    email = "admin@test.com"
    password = "admin123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:3001/api/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $token = $loginResponse.data.token
    $userId = $loginResponse.data.user.id
    Write-Host "✅ Login bem-sucedido!" -ForegroundColor Green
    Write-Host "   User ID: $userId" -ForegroundColor Gray
    Write-Host "   Token: $($token.Substring(0, 30))..." -ForegroundColor Gray
} catch {
    Write-Host "❌ Erro no login: $_" -ForegroundColor Red
    Write-Host "`n⚠️  Certifique-se de ter criado o usuário admin@test.com no Supabase!" -ForegroundColor Yellow
    exit
}

# 3. Listar Devices
Write-Host "`n3️⃣ Listando devices..." -ForegroundColor Yellow
$headers = @{
    Authorization = "Bearer $token"
}
$devices = Invoke-RestMethod -Uri "http://localhost:3001/api/devices" -Method Get -Headers $headers
Write-Host "✅ Devices encontrados: $($devices.devices.Count)" -ForegroundColor Green

# 4. Criar Device
if ($devices.devices.Count -eq 0) {
    Write-Host "`n4️⃣ Criando device de teste..." -ForegroundColor Yellow
    $deviceBody = @{
        name = "Sensor Teste"
        mqttBroker = "broker.hivemq.com"
        mqttPort = "1883"
        mqttTopic = "test/iot/sensor/$userId"
    } | ConvertTo-Json

    $newDevice = Invoke-RestMethod -Uri "http://localhost:3001/api/devices" -Method Post -Body $deviceBody -ContentType "application/json" -Headers $headers
    $deviceId = $newDevice.data.id
    Write-Host "✅ Device criado!" -ForegroundColor Green
    Write-Host "   Device ID: $deviceId" -ForegroundColor Gray
    Write-Host "   Nome: $($newDevice.data.name)" -ForegroundColor Gray
} else {
    $deviceId = $devices.devices[0].id
    Write-Host "✅ Usando device existente: $deviceId" -ForegroundColor Green
}

# 5. Criar Widget
Write-Host "`n5️⃣ Criando widget..." -ForegroundColor Yellow
$widgetBody = @{
    name = "Temperatura"
    type = "line"
    deviceId = $deviceId
    config = @{
        mqttField = "temperature"
    }
    position = @{
        x = 0
        y = 0
        width = 400
        height = 300
    }
} | ConvertTo-Json -Depth 5

try {
    $newWidget = Invoke-RestMethod -Uri "http://localhost:3001/api/widgets" -Method Post -Body $widgetBody -ContentType "application/json" -Headers $headers
    Write-Host "✅ Widget criado!" -ForegroundColor Green
    Write-Host "   Widget ID: $($newWidget.data.id)" -ForegroundColor Gray
} catch {
    Write-Host "⚠️  Widget já existe ou erro: $_" -ForegroundColor Yellow
}

# 6. Verificar dados MQTT
Write-Host "`n6️⃣ Buscando dados MQTT..." -ForegroundColor Yellow
try {
    $mqttData = Invoke-RestMethod -Uri "http://localhost:3001/api/mqtt/$deviceId/data?limit=5" -Method Get -Headers $headers
    Write-Host "✅ Dados MQTT: $($mqttData.data.Count) registros" -ForegroundColor Green
    if ($mqttData.data.Count -gt 0) {
        Write-Host "   Último payload: $($mqttData.data[0].payload | ConvertTo-Json -Compress)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️  Nenhum dado MQTT ainda" -ForegroundColor Yellow
}

# Resumo
Write-Host "`n" + "="*50 -ForegroundColor Cyan
Write-Host "✅ TESTES CONCLUÍDOS COM SUCESSO!" -ForegroundColor Green
Write-Host "="*50 -ForegroundColor Cyan

Write-Host "`n📋 RESUMO:" -ForegroundColor Cyan
Write-Host "   - User ID: $userId"
Write-Host "   - Device ID: $deviceId"
Write-Host "   - Token: $($token.Substring(0, 40))..."

Write-Host "`n🧪 PRÓXIMOS PASSOS:" -ForegroundColor Yellow
Write-Host "   1. Publique dados MQTT no tópico: test/iot/sensor/$userId"
Write-Host "   2. Use: mosquitto_pub -h broker.hivemq.com -t 'test/iot/sensor/$userId' -m '{""temperature"":25.5}'"
Write-Host "   3. Ou teste pelo frontend: cd frontend/teste-mcp && npm start`n"
