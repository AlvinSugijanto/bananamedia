"use client"

/**
 * ============================================================================
 * IOTA DAPP INTEGRATION COMPONENT
 * ============================================================================
 * 
 * This is the main integration component for your IOTA dApp.
 * 
 * All the contract logic is in hooks/useContract.ts
 * 
 * To customize your dApp, modify this file.
 * 
 * ============================================================================
 */

import { useCurrentAccount } from "@iota/dapp-kit"
import { useContract } from "@/hooks/useContract"
import { Button, Container, Flex, Heading, Text, TextField } from "@radix-ui/themes"
import ClipLoader from "react-spinners/ClipLoader"
import { useState } from "react"

const SampleIntegration = () => {
  const currentAccount = useCurrentAccount()
  const { data, actions, state, objectId, isOwner, objectExists, hasValidData } = useContract()
  
  const [oliveOils, setOliveOils] = useState("")
  const [yeast, setYeast] = useState("")
  const [flour, setFlour] = useState("")
  const [water, setWater] = useState("")
  const [salt, setSalt] = useState("")
  const [tomatoSauce, setTomatoSauce] = useState("")
  const [cheese, setCheese] = useState("")
  const [pineapple, setPineapple] = useState("")
  const [pizzaboxId, setPizzaboxId] = useState("")
  
  const isConnected = !!currentAccount

  if (!isConnected) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
        <div style={{ maxWidth: "500px", width: "100%" }}>
          <Heading size="6" style={{ marginBottom: "1rem" }}>Pizza dApp</Heading>
          <Text>Please connect your wallet to interact with the contract.</Text>
        </div>
      </div>
    )
  }

  const handleCook = () => {
    const values = [oliveOils, yeast, flour, water, salt, tomatoSauce, cheese, pineapple]
    if (values.every(v => v !== "" && !isNaN(Number(v)))) {
      actions.cook(
        Number(oliveOils),
        Number(yeast),
        Number(flour),
        Number(water),
        Number(salt),
        Number(tomatoSauce),
        Number(cheese),
        Number(pineapple)
      )
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: "1rem", background: "var(--gray-a2)" }}>
      <Container style={{ maxWidth: "800px", margin: "0 auto" }}>
        <Heading size="6" style={{ marginBottom: "2rem" }}>Pizza dApp</Heading>

        {!objectId ? (
          <div>
            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Olive Oils (u16)</Text>
              <TextField.Root
                value={oliveOils}
                onChange={(e) => setOliveOils(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Yeast (u16)</Text>
              <TextField.Root
                value={yeast}
                onChange={(e) => setYeast(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Flour (u16)</Text>
              <TextField.Root
                value={flour}
                onChange={(e) => setFlour(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>
            
            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Water (u16)</Text>
              <TextField.Root
                value={water}
                onChange={(e) => setWater(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Salt (u16)</Text>
              <TextField.Root
                value={salt}
                onChange={(e) => setSalt(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Tomato Sauce (u16)</Text>
              <TextField.Root
                value={tomatoSauce}
                onChange={(e) => setTomatoSauce(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Cheese (u16)</Text>
              <TextField.Root
                value={cheese}
                onChange={(e) => setCheese(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Pineapple (u16)</Text>
              <TextField.Root
                value={pineapple}
                onChange={(e) => setPineapple(e.target.value)}
                placeholder="Enter amount"
                type="number"
              />
            </div>

            <Button
              size="3"
              onClick={handleCook}
              disabled={state.isPending || [oliveOils, yeast, flour, water, salt, tomatoSauce, cheese, pineapple].some(v => v === "" || isNaN(Number(v)))}
            >
              {state.isPending ? (
                <>
                  <ClipLoader size={16} style={{ marginRight: "8px" }} />
                  Cooking...
                </>
              ) : (
                "Cook Pizza"
              )}
            </Button>
            {state.error && (
              <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--red-a3)", borderRadius: "8px" }}>
                <Text style={{ color: "var(--red-11)" }}>
                  Error: {(state.error as Error)?.message || String(state.error)}
                </Text>
              </div>
            )}
          </div>
        ) : (
          <div>
            {state.isLoading && !data ? (
              <Text>Loading PizzaBox...</Text>
            ) : state.error ? (
              <div style={{ padding: "1rem", background: "var(--red-a3)", borderRadius: "8px" }}>
                <Text style={{ color: "var(--red-11)", display: "block", marginBottom: "0.5rem" }}>
                  Error loading PizzaBox
                </Text>
                <Text size="2" style={{ color: "var(--red-11)" }}>
                  {state.error.message || "Object not found or invalid"}
                </Text>
                <Text size="1" style={{ color: "var(--gray-a11)", marginTop: "0.5rem", display: "block" }}>
                  Object ID: {objectId}
                </Text>
                <Button
                  size="2"
                  variant="soft"
                  onClick={actions.clearObject}
                  style={{ marginTop: "1rem" }}
                >
                  Clear & Cook New
                </Button>
              </div>
            ) : objectExists && !hasValidData ? (
              <div style={{ padding: "1rem", background: "var(--yellow-a3)", borderRadius: "8px" }}>
                <Text style={{ color: "var(--yellow-11)" }}>
                  Object found but data structure is invalid. Please check the contract structure.
                </Text>
                <Text size="1" style={{ color: "var(--gray-a11)", marginTop: "0.5rem", display: "block" }}>
                  Object ID: {objectId}
                </Text>
              </div>
            ) : data ? (
              <div>
                <div style={{ marginBottom: "1rem", padding: "1rem", background: "var(--gray-a3)", borderRadius: "8px" }}>
                  <Heading size="5" style={{ marginBottom: "0.5rem" }}>PizzaBox Created</Heading>
                  <Text size="1" style={{ color: "var(--gray-a11)", display: "block" }}>
                    Object ID: {objectId}
                  </Text>
                  <Text size="1" style={{ color: "var(--gray-a11)", display: "block" }}>
                    Owner: {data.owner}
                  </Text>
                </div>

                {isOwner && (
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ marginBottom: "1rem" }}>
                      <Text size="2" style={{ display: "block", marginBottom: "0.5rem" }}>Get Flag (PizzaBox ID)</Text>
                      <TextField.Root
                        value={pizzaboxId}
                        onChange={(e) => setPizzaboxId(e.target.value)}
                        placeholder={objectId || "Enter PizzaBox ID"}
                      />
                    </div>
                    <Button
                      onClick={() => {
                        const id = pizzaboxId || objectId
                        if (id) {
                          actions.getFlag(id)
                        }
                      }}
                      disabled={state.isLoading || state.isPending}
                      style={{ marginRight: "0.5rem" }}
                    >
                      {state.isLoading || state.isPending ? <ClipLoader size={16} /> : "Get Flag"}
                    </Button>
                  </div>
                )}

                {state.hash && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--gray-a3)", borderRadius: "8px" }}>
                    <Text size="1" style={{ display: "block", marginBottom: "0.5rem" }}>Transaction Hash</Text>
                    <Text size="2" style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{state.hash}</Text>
                    {state.isConfirmed && (
                      <Text size="2" style={{ color: "green", marginTop: "0.5rem", display: "block" }}>
                        Transaction confirmed!
                      </Text>
                    )}
                  </div>
                )}

                {state.error && (
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--red-a3)", borderRadius: "8px" }}>
                    <Text style={{ color: "var(--red-11)" }}>
                      Error: {(state.error as Error)?.message || String(state.error)}
                    </Text>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: "1rem", background: "var(--yellow-a3)", borderRadius: "8px" }}>
                <Text style={{ color: "var(--yellow-11)" }}>PizzaBox not found</Text>
                <Text size="1" style={{ color: "var(--gray-a11)", marginTop: "0.5rem", display: "block" }}>
                  Object ID: {objectId}
                </Text>
                <Button
                  size="2"
                  variant="soft"
                  onClick={actions.clearObject}
                  style={{ marginTop: "1rem" }}
                >
                  Clear & Cook New
                </Button>
              </div>
            )}
          </div>
        )}
      </Container>
    </div>
  )
}

export default SampleIntegration