// This function generates a "secret" name.
// The name is a combination of a random animal name and a random number.
// The animal name is selected from a list of animals.
// The number is selected from a range of 0 to 100.
// We have a total of 102 animals in the list and use a random number between 
// 0 and 100, so the total number of possible unique combinations 
// is 102 * 100 = 10, 200
// This code does not check for uniqueness, since it's not maintining a list of 
// generated secret names.

// Custom list of animal names
const animals = [
    'aardvark', 'agouti', 'albatross', 'anteater', 'antelope',
    'ape', 'armadillo', 'baboon', 'bandicoot', 'barb',
    'bear', 'beaver', 'bittern', 'bilby', 'bison',
    'bongo', 'booby', 'buffalo', 'bushbaby', 'capybara',
    'caracal', 'cassowary', 'cat', 'cheetah', 'chimpanzee',
    'chinchilla', 'coyote', 'crow', 'deer', 'dhole',
    'dolphin', 'dove', 'eagle', 'echidna', 'emu',
    'ferret', 'finch', 'flamingo', 'frog', 'gazelle',
    'gecko', 'goat', 'goldfish', 'gopher', 'grouse',
    'hawk', 'heron', 'hippopotamus', 'hummingbird', 'impala',
    'jaguar', 'jaguarundi', 'kangaroo', 'kiwi', 'kinkajou',
    'koala', 'kudu', 'lemur', 'leopard', 'lemming',
    'lion', 'lizard', 'loon', 'loris', 'lynx',
    'macaque', 'mammoth', 'manatee', 'meerkat', 'mink',
    'moose', 'mouse', 'mule', 'numbat', 'ocelot',
    'okapi', 'opossum', 'otter', 'panda', 'patagonian',
    'pelican', 'platypus', 'pika', 'pigeon', 'porcupine',
    'possum', 'quail', 'quokka', 'raccoon', 'rat',
    'rhea', 'reindeer', 'seal', 'seahorse', 'siskin',
    'skunk', 'sloth', 'squirrel', 'tapir', 'tern',
    'toad', 'tortoise', 'turtle', 'uakari', 'viper',
    'wolverine', 'woodpecker', 'wolf', 'wombat', 'zebra',
    'zebu'
];

// Function to generate a readable "secret" name
const generateSecretName = () => {
    const secretName = animals[Math.floor(Math.random() * animals.length)];
    const secretNumber = Math.floor(Math.random() * 100);
    return secretName + secretNumber;
};

module.exports = { generateSecretName };