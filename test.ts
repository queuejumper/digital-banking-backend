function getFirstPairWithSumZero(arr: number[]): [number, number] | null {
    const seen = new Map<number, boolean>();
    
    for (let i = 0; i < arr.length; i++) {
        const num = arr[i];
        const complement = -num;
        
        if (seen.has(complement)) {
            return [complement, num];
        }
        
        seen.set(num, true);
    }
    
    return null;
}

// Example usage
console.log(getFirstPairWithSumZero([3, -3, 2, -2, 0])); // [3, -3]
console.log(getFirstPairWithSumZero([5, 4, 3, 2, 1]));  // null
console.log(getFirstPairWithSumZero([-4, 4, 2, -2]));   // [-4, 4]
