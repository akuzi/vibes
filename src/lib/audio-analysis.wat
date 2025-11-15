(module
  (memory (export "memory") 1)
  
  ;; Function to analyze frequency data and detect phoneme
  ;; Input: pointer to frequency data (128 bytes), volume (f32)
  ;; Output: phoneme index (i32)
  (func $detectPhoneme (param $freqPtr i32) (param $volume f32) (result i32)
    (local $lowSum f32)
    (local $midSum f32)
    (local $highSum f32)
    (local $veryHighSum f32)
    (local $i i32)
    (local $lowBand f32)
    (local $midBand f32)
    (local $highBand f32)
    (local $veryHighBand f32)
    (local $totalEnergy f32)
    
    ;; Check volume threshold
    (if (f32.lt (local.get $volume) (f32.const 0.01))
      (then (return (i32.const 0))) ;; silence
    )
    
    ;; Calculate low band (0-8)
    (local.set $i (i32.const 0))
    (loop $lowLoop
      (local.set $lowSum 
        (f32.add 
          (local.get $lowSum)
          (f32.convert_i32_u 
            (i32.load8_u (i32.add (local.get $freqPtr) (local.get $i)))
          )
        )
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $lowLoop (i32.lt_u (local.get $i) (i32.const 8)))
    )
    (local.set $lowBand (f32.div (local.get $lowSum) (f32.const 8)))
    
    ;; Calculate mid band (8-28)
    (local.set $i (i32.const 8))
    (loop $midLoop
      (local.set $midSum 
        (f32.add 
          (local.get $midSum)
          (f32.convert_i32_u 
            (i32.load8_u (i32.add (local.get $freqPtr) (local.get $i)))
          )
        )
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $midLoop (i32.lt_u (local.get $i) (i32.const 28)))
    )
    (local.set $midBand (f32.div (local.get $midSum) (f32.const 20)))
    
    ;; Calculate high band (28-48)
    (local.set $i (i32.const 28))
    (loop $highLoop
      (local.set $highSum 
        (f32.add 
          (local.get $highSum)
          (f32.convert_i32_u 
            (i32.load8_u (i32.add (local.get $freqPtr) (local.get $i)))
          )
        )
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $highLoop (i32.lt_u (local.get $i) (i32.const 48)))
    )
    (local.set $highBand (f32.div (local.get $highSum) (f32.const 20)))
    
    ;; Calculate very high band (48-72)
    (local.set $i (i32.const 48))
    (loop $veryHighLoop
      (local.set $veryHighSum 
        (f32.add 
          (local.get $veryHighSum)
          (f32.convert_i32_u 
            (i32.load8_u (i32.add (local.get $freqPtr) (local.get $i)))
          )
        )
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $veryHighLoop (i32.lt_u (local.get $i) (i32.const 72)))
    )
    (local.set $veryHighBand (f32.div (local.get $veryHighSum) (f32.const 24)))
    
    ;; Calculate total energy
    (local.set $totalEnergy 
      (f32.add 
        (f32.add (local.get $lowBand) (local.get $midBand))
        (f32.add (local.get $highBand) (local.get $veryHighBand))
      )
    )
    
    (if (f32.lt (local.get $totalEnergy) (f32.const 10))
      (then (return (i32.const 0))) ;; silence
    )
    
    ;; Vowel detection
    (if (f32.and
          (f32.gt (local.get $lowBand) (f32.mul (local.get $midBand) (f32.const 1.5)))
          (f32.gt (local.get $lowBand) (f32.mul (local.get $highBand) (f32.const 2)))
        )
      (then
        (if (f32.gt (local.get $midBand) (local.get $highBand))
          (then (return (i32.const 4))) ;; 'o'
          (else (return (i32.const 1))) ;; 'a'
        )
      )
    )
    
    (if (f32.and
          (f32.gt (local.get $midBand) (f32.mul (local.get $lowBand) (f32.const 1.3)))
          (f32.gt (local.get $midBand) (f32.mul (local.get $highBand) (f32.const 1.5)))
        )
      (then (return (i32.const 2))) ;; 'e'
    )
    
    (if (f32.and
          (f32.gt (local.get $highBand) (f32.mul (local.get $midBand) (f32.const 1.2)))
          (f32.gt (local.get $highBand) (f32.mul (local.get $lowBand) (f32.const 1.5)))
        )
      (then (return (i32.const 3))) ;; 'i'
    )
    
    ;; Consonant detection
    (if (f32.gt (local.get $veryHighBand) (f32.mul (local.get $highBand) (f32.const 1.5)))
      (then
        (if (f32.gt (local.get $highBand) (local.get $midBand))
          (then (return (i32.const 5))) ;; 's'
          (else (return (i32.const 6))) ;; 'f'
        )
      )
    )
    
    (if (f32.and
          (f32.gt (local.get $lowBand) (f32.mul (local.get $midBand) (f32.const 2)))
          (f32.gt (local.get $volume) (f32.const 0.2))
        )
      (then
        (if (f32.gt (local.get $volume) (f32.const 0.3))
          (then (return (i32.const 7))) ;; 'b'
          (else (return (i32.const 8))) ;; 'd'
        )
      )
    )
    
    ;; Default
    (return (i32.const 1)) ;; 'a'
  )
  
  ;; Function to calculate RMS volume from time domain data
  ;; Input: pointer to time data, length (i32)
  ;; Output: volume (f32)
  (func $calculateVolume (param $timePtr i32) (param $length i32) (result f32)
    (local $sumSquares f32)
    (local $i i32)
    (local $sample f32)
    (local $rms f32)
    
    (local.set $i (i32.const 0))
    (loop $volumeLoop
      ;; Get sample and normalize to -1 to 1
      (local.set $sample 
        (f32.div 
          (f32.convert_i32_s 
            (i32.sub 
              (i32.load8_u (i32.add (local.get $timePtr) (local.get $i)))
              (i32.const 128)
            )
          )
          (f32.const 128)
        )
      )
      ;; Square and add
      (local.set $sumSquares 
        (f32.add 
          (local.get $sumSquares)
          (f32.mul (local.get $sample) (local.get $sample))
        )
      )
      (local.set $i (i32.add (local.get $i) (i32.const 1)))
      (br_if $volumeLoop (i32.lt_u (local.get $i) (local.get $length)))
    )
    
    ;; Calculate RMS
    (local.set $rms 
      (f32.sqrt 
        (f32.div (local.get $sumSquares) (f32.convert_i32_u (local.get $length)))
      )
    )
    
    ;; Apply gain and clamp
    (local.set $rms (f32.mul (local.get $rms) (f32.const 3)))
    (if (f32.gt (local.get $rms) (f32.const 1))
      (then (local.set $rms (f32.const 1)))
    )
    
    (return (local.get $rms))
  )
  
  (export "detectPhoneme" (func $detectPhoneme))
  (export "calculateVolume" (func $calculateVolume))
)


