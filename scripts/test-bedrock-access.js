const { BedrockClient, ListFoundationModelsCommand } = require("@aws-sdk/client-bedrock");
const { BedrockAgentClient, ListAgentsCommand } = require("@aws-sdk/client-bedrock-agent");
const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

require('dotenv').config({ path: '.env.local' });

async function testAccess() {
  console.log("--- Iniciando Diagnóstico de Permisos AWS Bedrock ---");
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Access Key: ${process.env.AWS_ACCESS_KEY_ID ? 'Configurada' : 'Faltante'}`);
  console.log(`Agent ID: ${process.env.BEDROCK_AGENT_ID}`);
  console.log(`Alias ID: ${process.env.BEDROCK_AGENT_ALIAS_ID}`);
  console.log("---------------------------------------------------");

  // 1. Test Basic Bedrock Access (List Models)
  try {
    console.log("\n1. Probando acceso a Bedrock (ListFoundationModels)...");
    const bedrock = new BedrockClient({ region: process.env.AWS_REGION });
    const command = new ListFoundationModelsCommand({ byProvider: "anthropic" });
    const response = await bedrock.send(command);
    console.log("✅ Éxito: Se pueden listar modelos.");
    console.log(`   Modelos encontrados: ${response.modelSummaries.length}`);
  } catch (error) {
    console.error("❌ Fallo: No se pueden listar modelos.");
    console.error("   Error:", error.message);
  }

  // 2. Test Agent Management Access (List Agents)
  try {
    console.log("\n2. Probando acceso a Agentes (ListAgents)...");
    const bedrockAgent = new BedrockAgentClient({ region: process.env.AWS_REGION });
    const command = new ListAgentsCommand({});
    const response = await bedrockAgent.send(command);
    console.log("✅ Éxito: Se pueden listar agentes.");
    const foundAgent = response.agentSummaries.find(a => a.agentId === process.env.BEDROCK_AGENT_ID);
    if (foundAgent) {
        console.log("✅ Éxito: El agente configurado fue encontrado en la lista.");
        console.log(`   Status: ${foundAgent.agentStatus}`);
    } else {
        console.warn("⚠️ Advertencia: El agente configurado NO está en la lista (¿Región incorrecta?).");
    }
  } catch (error) {
    console.error("❌ Fallo: No se pueden listar agentes.");
    console.error("   Error:", error.message);
  }

  // 3. Test Agent Invocation (Invoke Agent)
  try {
    console.log("\n3. Probando invocación del Agente (InvokeAgent)...");
    const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });
    
    // Intentar primero con el Alias configurado
    console.log(`   Intentando con Alias Configurado: ${process.env.BEDROCK_AGENT_ALIAS_ID}`);
    try {
        const command = new InvokeAgentCommand({
            agentId: process.env.BEDROCK_AGENT_ID,
            agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
            sessionId: 'test-session-prod',
            inputText: 'Hola, prueba de conectividad.'
        });
        await client.send(command);
        console.log("✅ Éxito con Alias Configurado.");
    } catch (e) {
        console.log(`❌ Falló con Alias Configurado: ${e.message}`);
    }

    // Intentar con TSTALIASID (Borrador)
    console.log(`\n   Intentando con Alias de Prueba (TSTALIASID)...`);
    try {
        const command = new InvokeAgentCommand({
            agentId: process.env.BEDROCK_AGENT_ID,
            agentAliasId: 'TSTALIASID', // Alias reservado para Draft
            sessionId: 'test-session-draft',
            inputText: 'Hola, prueba de conectividad.'
        });
        const response = await client.send(command);
        console.log("✅ Éxito con TSTALIASID (Draft).");
        
        if (response.completion) {
            for await (const event of response.completion) {
                 // Consumir stream
            }
        }
    } catch (e) {
        console.log(`❌ Falló con TSTALIASID: ${e.message}`);
        if (e.$metadata) console.log(`   HTTP Status: ${e.$metadata.httpStatusCode}`);
    }
  } catch (error) {
    console.error("❌ Fallo: Error al invocar el agente.");
    console.error("   Error Name:", error.name);
    console.error("   Error Message:", error.message);
    if (error.$metadata) {
        console.error("   HTTP Status:", error.$metadata.httpStatusCode);
    }
  }
}

testAccess();
