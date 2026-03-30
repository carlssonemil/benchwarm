'use client'

import React, { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AvailabilityStep } from './availability-step'
import { BankReviewStep } from './bank-review-step'
import { WheelStep } from './wheel-step'
import { ResultsStep } from './results-step'
import { computePlayerBanks } from '@/actions/match-actions'
import type { SelectionResult } from '@/lib/selection'
import type { Player, PlayerWithBank, Season, Team } from '@/types/database'

type Step = 1 | 2 | 3 | 4

const STEP_LABELS: Record<Step, string> = {
  1: 'Availability',
  2: 'Bank review',
  3: 'Selection',
  4: 'Confirm',
}

interface MatchWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: Team
  activeSeason: Season
  activePlayers: Player[]
  getPinHash: () => string | null
  /** When set, assigns players to an existing planned match instead of creating a new one */
  existingMatchId?: string
  existingMatchTitle?: string | null
  existingMatchDate?: string
  onSaved?: () => void
}

export function MatchWizard({
  open,
  onOpenChange,
  team,
  activeSeason,
  activePlayers,
  getPinHash,
  existingMatchId,
  existingMatchTitle,
  existingMatchDate,
  onSaved,
}: MatchWizardProps) {
  const router = useRouter()

  // Step state
  const [step, setStep] = useState<Step>(1)

  // Step 1 output
  const [availableIds, setAvailableIds] = useState<string[]>([])

  // Step 2 output (loaded from server)
  const [bankedPlayers, setBankedPlayers] = useState<PlayerWithBank[]>([])
  const [isLoadingBanks, startBankTransition] = useTransition()

  // Step 3 output
  const [selection, setSelection] = useState<SelectionResult | null>(null)

  // Pre-check all active players when wizard opens
  useEffect(() => {
    if (open) {
      setAvailableIds(activePlayers.map(p => p.id))
      setStep(1)
      setSelection(null)
      setBankedPlayers([])
    }
  }, [open, activePlayers, activeSeason.id])

  function handleStep1Next() {
    const available = activePlayers.filter(p => availableIds.includes(p.id))
    startBankTransition(async () => {
      const banks = await computePlayerBanks(activeSeason.id, available)
      setBankedPlayers(banks)
      setStep(2)
    })
  }

  function handleStep3Confirm(result: SelectionResult) {
    setSelection(result)
    setStep(4)
  }

  function handleSaved() {
    onOpenChange(false)
    router.refresh()
    onSaved?.()
  }

  function handleClose() {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {/* Wider on step 3 to give the wheel breathing room */}
      <DialogContent className={`max-h-[92dvh] flex flex-col overflow-hidden transition-all duration-300 ${step === 3 ? 'sm:max-w-xl' : 'sm:max-w-lg'}`}>
        <DialogHeader>
          <DialogTitle>
            {existingMatchId ? 'Assign players' : 'New match'} · {activeSeason.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 pb-2">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <StepPane key="step-1">
                <AvailabilityStep
                  activePlayers={activePlayers}
                  availableIds={availableIds}
                  onChange={setAvailableIds}
                  onNext={handleStep1Next}
                  isLoading={isLoadingBanks}
                  stepIndicator={<StepIndicator current={step} />}
                />
              </StepPane>
            )}

            {step === 2 && (
              <StepPane key="step-2">
                <BankReviewStep
                  bankedPlayers={bankedPlayers}
                  matchSize={team.match_size}
                  onBack={() => setStep(1)}
                  onNext={() => setStep(3)}
                  stepIndicator={<StepIndicator current={step} />}
                />
              </StepPane>
            )}

            {step === 3 && (
              <StepPane key="step-3">
                <WheelStep
                  bankedPlayers={bankedPlayers}
                  matchSize={team.match_size}
                  onBack={() => setStep(2)}
                  onConfirm={handleStep3Confirm}
                  stepIndicator={<StepIndicator current={step} />}
                />
              </StepPane>
            )}

            {step === 4 && selection && (
              <StepPane key="step-4">
                <ResultsStep
                  slug={team.slug}
                  getPinHash={getPinHash}
                  teamId={team.id}
                  seasonId={activeSeason.id}
                  activePlayers={activePlayers}
                  availableIds={availableIds}
                  selection={selection}
                  bankedPlayers={bankedPlayers}
                  onBack={() => setStep(3)}
                  onSaved={handleSaved}
                  stepIndicator={<StepIndicator current={step} />}
                  existingMatchId={existingMatchId}
                  existingMatchTitle={existingMatchTitle}
                  existingMatchDate={existingMatchDate}
                />
              </StepPane>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StepPane({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.18, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  )
}

function StepIndicator({ current }: { current: Step }) {
  const steps: Step[] = [1, 2, 3, 4]
  return (
    <div className="flex items-center gap-1.5 shrink-0" aria-label={`Step ${current} of 4: ${STEP_LABELS[current]}`}>
      {steps.map(s => (
        <div
          key={s}
          className={`rounded-full h-1.5 transition-all duration-300 ease-in-out ${
            s === current
              ? 'w-4 bg-primary'
              : s < current
                ? 'w-1.5 bg-primary/40'
                : 'w-1.5 bg-muted-foreground/25'
          }`}
        />
      ))}
    </div>
  )
}
