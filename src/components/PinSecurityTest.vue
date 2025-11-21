<template>
  <div class="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
    <h2 class="text-2xl font-bold text-gray-800 mb-6">Test de sécurité des codes PIN</h2>
    
    <!-- Test de validation -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Test de validation</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Code PIN à tester
          </label>
          <input
            v-model="testPin"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Entrez un code PIN"
            maxlength="8"
          />
        </div>
        
        <button
          class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          @click="testPinValidation"
        >
          Tester la validation
        </button>
        
        <div v-if="validationResult" class="mt-4 p-4 rounded-lg" :class="validationResult.isValid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
          <p class="font-medium" :class="validationResult.isValid ? 'text-green-800' : 'text-red-800'">
            {{ validationResult.message }}
          </p>
        </div>
      </div>
    </div>
    
    <!-- Test de force -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Analyse de la force</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Code PIN à analyser
          </label>
          <input
            v-model="strengthPin"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Entrez un code PIN"
            maxlength="8"
          />
        </div>
        
        <button
          class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          @click="analyzePinStrength"
        >
          Analyser la force
        </button>
        
        <div v-if="strengthResult" class="mt-4 p-4 rounded-lg border" :class="getStrengthClass(strengthResult.strength)">
          <div class="flex items-center justify-between mb-2">
            <span class="font-medium" :class="getStrengthTextClass(strengthResult.strength)">
              {{ strengthResult.message }}
            </span>
            <span class="text-sm font-mono">
              Score: {{ strengthResult.score }}/5
            </span>
          </div>
          
          <div class="space-y-1">
            <div v-for="reason in strengthResult.reasons" :key="reason" class="text-sm">
              <span class="inline-block w-2 h-2 rounded-full mr-2" :class="getReasonClass(reason)"></span>
              {{ reason }}
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Test de hachage -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Test de hachage</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-600 mb-2">
            Code PIN à hacher
          </label>
          <input
            v-model="hashPin"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Entrez un code PIN"
            maxlength="8"
          />
        </div>
        
        <button
          :disabled="isHashing"
          class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          @click="testHashing"
        >
          {{ isHashing ? 'Hachage en cours...' : 'Tester le hachage' }}
        </button>
        
        <div v-if="hashResult" class="mt-4 p-4 bg-gray-50 rounded-lg border">
          <h4 class="font-medium text-gray-700 mb-2">Résultat du hachage :</h4>
          <div class="space-y-2">
            <div>
              <span class="text-sm font-medium text-gray-600">Code PIN original :</span>
              <span class="ml-2 font-mono text-sm">{{ hashResult.original }}</span>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-600">Code PIN haché :</span>
              <div class="mt-1 p-2 bg-white rounded border font-mono text-xs break-all">
                {{ hashResult.hashed }}
              </div>
            </div>
            <div>
              <span class="text-sm font-medium text-gray-600">Temps de hachage :</span>
              <span class="ml-2 font-mono text-sm">{{ hashResult.time }}ms</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Test de vérification -->
    <div class="mb-8">
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Test de vérification</h3>
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Code PIN original
            </label>
            <input
              v-model="verifyOriginal"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Code PIN original"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-600 mb-2">
              Code PIN à vérifier
            </label>
            <input
              v-model="verifyTest"
              type="password"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Code PIN à vérifier"
            />
          </div>
        </div>
        
        <button
          :disabled="isVerifying"
          class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
          @click="testVerification"
        >
          {{ isVerifying ? 'Vérification en cours...' : 'Tester la vérification' }}
        </button>
        
        <div v-if="verificationResult" class="mt-4 p-4 rounded-lg border" :class="verificationResult.isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'">
          <p class="font-medium" :class="verificationResult.isValid ? 'text-green-800' : 'text-red-800'">
            {{ verificationResult.message }}
          </p>
          <p class="text-sm text-gray-600 mt-1">
            Temps de vérification : {{ verificationResult.time }}ms
          </p>
        </div>
      </div>
    </div>
    
    <!-- Génération de code PIN sécurisé -->
    <div>
      <h3 class="text-lg font-semibold text-gray-700 mb-4">Génération de code PIN sécurisé</h3>
      <div class="space-y-4">
        <div class="flex items-center space-x-4">
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            @click="generateSecurePin(4)"
          >
            Générer PIN 4 chiffres
          </button>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            @click="generateSecurePin(6)"
          >
            Générer PIN 6 chiffres
          </button>
          <button
            class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            @click="generateSecurePin(8)"
          >
            Générer PIN 8 chiffres
          </button>
        </div>
        
        <div v-if="generatedPin" class="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
          <p class="font-medium text-indigo-800 mb-2">Code PIN généré :</p>
          <div class="font-mono text-lg text-indigo-900">{{ generatedPin }}</div>
          <button
            class="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
            @click="copyToClipboard(generatedPin)"
          >
            Copier dans le presse-papiers
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { HashService } from '../services/hashService.js';

export default {
  name: 'PinSecurityTest',
  data() {
    return {
      testPin: '',
      validationResult: null,
      strengthPin: '',
      strengthResult: null,
      hashPin: '',
      hashResult: null,
      isHashing: false,
      verifyOriginal: '',
      verifyTest: '',
      verificationResult: null,
      isVerifying: false,
      generatedPin: null
    };
  },
  methods: {
    testPinValidation() {
      const validation = HashService.validatePinFormat(this.testPin);
      this.validationResult = validation;
    },
    
    analyzePinStrength() {
      const strength = HashService.getPinStrength(this.strengthPin);
      this.strengthResult = strength;
    },
    
    async testHashing() {
      if (!this.hashPin) return;
      
      this.isHashing = true;
      const startTime = performance.now();
      
      try {
        const hashedPin = await HashService.hashPin(this.hashPin);
        const endTime = performance.now();
        
        this.hashResult = {
          original: this.hashPin,
          hashed: hashedPin,
          time: Math.round(endTime - startTime)
        };
      } catch (error) {
        console.error('Erreur lors du hachage:', error);
        this.hashResult = {
          original: this.hashPin,
          hashed: 'Erreur: ' + error.message,
          time: 0
        };
      } finally {
        this.isHashing = false;
      }
    },
    
    async testVerification() {
      if (!this.verifyOriginal || !this.verifyTest) return;
      
      this.isVerifying = true;
      const startTime = performance.now();
      
      try {
        const hashedPin = await HashService.hashPin(this.verifyOriginal);
        const isValid = await HashService.verifyPin(this.verifyTest, hashedPin);
        const endTime = performance.now();
        
        this.verificationResult = {
          isValid,
          message: isValid ? 'Les codes PIN correspondent' : 'Les codes PIN ne correspondent pas',
          time: Math.round(endTime - startTime)
        };
      } catch (error) {
        console.error('Erreur lors de la vérification:', error);
        this.verificationResult = {
          isValid: false,
          message: 'Erreur: ' + error.message,
          time: 0
        };
      } finally {
        this.isVerifying = false;
      }
    },
    
    generateSecurePin(length) {
      this.generatedPin = HashService.generateSecurePin(length);
    },
    
    async copyToClipboard(text) {
      try {
        await navigator.clipboard.writeText(text);
        // Optionnel: afficher une notification de succès
        console.log('Code PIN copié dans le presse-papiers');
      } catch (error) {
        console.error('Erreur lors de la copie:', error);
      }
    },
    
    getStrengthClass(strength) {
      switch (strength) {
        case 'strong': return 'bg-green-50 border-green-200';
        case 'medium': return 'bg-yellow-50 border-yellow-200';
        case 'weak': return 'bg-red-50 border-red-200';
        default: return 'bg-gray-50 border-gray-200';
      }
    },
    
    getStrengthTextClass(strength) {
      switch (strength) {
        case 'strong': return 'text-green-800';
        case 'medium': return 'text-yellow-800';
        case 'weak': return 'text-red-800';
        default: return 'text-gray-800';
      }
    },
    
    getReasonClass(reason) {
      if (reason.includes('suffisante') || reason.includes('diversité') || reason.includes('répétition')) {
        return 'bg-green-400';
      } else if (reason.includes('correcte')) {
        return 'bg-yellow-400';
      } else {
        return 'bg-red-400';
      }
    }
  }
};
</script>
