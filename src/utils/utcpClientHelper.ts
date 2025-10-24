/**
 * Utility functions for creating UTCP clients with automatic variable detection
 */

import { UtcpClient, type UtcpClientConfig } from "@utcp/sdk";

/**
 * Creates a UTCP client and automatically adds any required variables
 * that are missing from the config (with empty string values).
 * 
 * This ensures that the client can be created without variable errors,
 * allowing users to fill in API keys later.
 * 
 * @param root_dir Optional root directory for the client
 * @param config The UTCP client configuration
 * @param onVariablesAdded Optional callback that receives the variables that were added
 * @returns The created UTCP client
 */
export async function createUtcpClientWithAutoVariables(
  root_dir: string | undefined,
  config: UtcpClientConfig,
  onVariablesAdded?: (addedVariables: string[]) => void
): Promise<UtcpClient> {
  // If there are no manual call templates, just create the client normally
  if (!config.manual_call_templates || config.manual_call_templates.length === 0) {
    return UtcpClient.create(root_dir, config);
  }

  console.log('[UtcpClientHelper] Proactively detecting required variables...');
  
  // Create a temporary minimal client to use getRequiredVariablesForManualAndTools
  const minimalConfig = {
    ...config,
    manual_call_templates: [], // Don't register manuals yet
  };
  
  const tempClient = await UtcpClient.create(root_dir, minimalConfig);
  
  // Collect all required variables from all templates
  const allRequiredVariables = new Set<string>();
  
  for (const template of config.manual_call_templates) {
    try {
      const vars = await tempClient.getRequiredVariablesForManualAndTools(template);
      console.log('[UtcpClientHelper] Template', template.name, 'requires variables:', vars);
      vars.forEach(v => allRequiredVariables.add(v));
    } catch (err) {
      console.warn('[UtcpClientHelper] Could not get variables for template:', template.name, err);
    }
  }
  
  console.log('[UtcpClientHelper] All required variables:', Array.from(allRequiredVariables));
  
  // Create final config with all required variables
  const finalConfig = {
    ...config,
    variables: {
      ...(config.variables || {}),
    },
  };
  
  // Add only the variables that are missing
  const addedVariables: string[] = [];
  for (const varName of allRequiredVariables) {
    if (!(varName in finalConfig.variables)) {
      finalConfig.variables[varName] = '';
      addedVariables.push(varName);
    }
  }
  
  if (addedVariables.length > 0) {
    console.log('[UtcpClientHelper] Added missing variables:', addedVariables);
    
    // Notify callback if provided
    if (onVariablesAdded) {
      onVariablesAdded(addedVariables);
    }
  }
  
  // Create client with complete config
  const client = await UtcpClient.create(root_dir, finalConfig);
  
  return client;
}
