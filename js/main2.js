const charColorMap = {};
            let selectedChar = null;
            let textData = null;

            document.addEventListener('DOMContentLoaded', function () {
                const form = document.querySelector('form');
                const bubbleSvg = d3.select('#bubble_svg');
                const chordSvg = d3.select('#chord_svg');
                const flowLabel = document.getElementById('flow_label');

                form.addEventListener('submit', function (event) {
                    event.preventDefault();
                    const enteredText = d3.select('#wordbox').property('value');
                    textData = enteredText;
                    updateBubbleAndChord(enteredText);
                });

                function updateBubbleAndChord(text) {
                    const dataset = processData(text);
                    bubbleSvg.selectAll('*').remove();
                    createBubbleChart(dataset);

                    // Clear chord diagram if a new text is submitted
                    chordSvg.selectAll('*').remove();
                    flowLabel.textContent = "Character flow for ...";
                    selectedChar = null;
                }

                function processData(text) {
                    const charCounts = { Vowels: {}, Consonants: {}, Punctuation: {} };
                    text = text.toLowerCase();

                    for (const char of text) {
                        if (/[aeiouy]/.test(char)) {
                            charCounts.Vowels[char] = (charCounts.Vowels[char] || 0) + 1;
                        } else if (/[bcdfghjklmnpqrstvwxz]/.test(char)) {
                            charCounts.Consonants[char] = (charCounts.Consonants[char] || 0) + 1;
                        } else if (/[.,;:?!]/.test(char)) {
                            charCounts.Punctuation[char] = (charCounts.Punctuation[char] || 0) + 1;
                        }
                    }

                    const bubbleData = [
                        { name: 'Vowels', children: createChildrenArray(charCounts.Vowels) },
                        { name: 'Consonants', children: createChildrenArray(charCounts.Consonants) },
                        { name: 'Punctuation', children: createChildrenArray(charCounts.Punctuation) }
                    ];

                    return bubbleData;
                }

                function createChildrenArray(counts) {
                    return Object.entries(counts).map(([char, count]) => ({ name: char, value: count }));
                }

                function createBubbleChart(data) {
                    const diameter = 580;
                    const color = d3.scaleOrdinal()
                        .domain(['Vowels', 'Consonants', 'Punctuation'])
                        .range(['#1f77b4', '#ff7f0e', '#2ca02c']);
                
                    const bubble = d3.pack(data)
                        .size([diameter, diameter])
                        .padding(1.5);
                
                    const root = d3.hierarchy({ children: data })
                        .sum(d => d.value);
                
                    const nodes = bubble(root).descendants();
                
                    const bubbleGroup = bubbleSvg.append('g')
                        .attr('transform', 'translate(0, -100)') // Adjust the vertical translation here
                        .selectAll('.node')
                        .data(nodes)
                        .enter().filter(d => !d.children) // Only leaf nodes (individual characters)
                        .append('g')
                        .attr('class', 'node')
                        .attr('transform', d => `translate(${d.x},${d.y})`);
                
                    bubbleGroup.append('circle')
                        .attr('r', d => d.r)
                        .style('fill', d => color(d.parent.data.name))
                        .on('click', function (event, d) {
                            selectedChar = d.data.name;
                            console.log(selectedChar);
                            updateChord(selectedChar);
                        });
                
                    bubbleGroup.append('text')
                        .attr('dy', '.2em')
                        .style('text-anchor', 'middle')
                        .style('font-size', d => Math.min(1.5 * d.r, (1.5 * d.r - 2) / 1 * 24) + 'px') // Adjust the font size dynamically
                        .text(d => d.data.name);
                
                    bubbleGroup.append('title')
                        .text(d => `Character : ${d.data.name}\nCount : ${d.data.value}`);
                }
                
                function updateChord(char) {
                    console.log(char);
                    // Clear Sankey diagram if a new text is submitted
                    chordSvg.selectAll('*').remove();
                    flowLabel.textContent = `Character flow for '${char}'`;
                }

                function updateChord(char) {
                    // Extract adjacent characters from the text data
                    const adjacentChars = findAdjacentChars(char, textData);
                    console.log(adjacentChars);
                    // Build dataset for the chord diagram
                    const chordDataset = buildChordDataset(adjacentChars);
                    console.log(chordDataset);
                    // Create the chord diagram
                    createChordDiagram(chordDataset);
                
                    flowLabel.textContent = `Chord diagram for '${char}'`;
                }
                
                function findAdjacentChars(char, text) {
                    const adjacentChars = [];
                
                    // Iterate through the text to find all occurrences of the selected character
                    for (let i = 0; i < text.length; i++) {
                        if (text[i] === char) {
                            // Record the previous and next characters for each occurrence of the selected character
                            const prevChar = i > 0 ? text[i - 1] : null;
                            const nextChar = i < text.length - 1 ? text[i + 1] : null;
                            adjacentChars.push({ prev: prevChar, next: nextChar });
                        }
                    }
                
                    return adjacentChars;
                }
                
                
                function buildChordDataset(adjacentChars) {
                    const matrix = [];
                    const names = [];
                    
                    // Iterate through the array of adjacent characters
                    adjacentChars.forEach(({ prev, next }) => {
                        // Add the previous and next characters to the names array if they are not already included
                        if (prev && !names.includes(prev)) names.push(prev);
                        if (next && !names.includes(next)) names.push(next);
                    });
                
                    // Initialize the matrix with zeros
                    for (let i = 0; i < names.length; i++) {
                        matrix[i] = Array(names.length).fill(0);
                    }
                    
                    // Iterate through the array of adjacent characters again to update the matrix
                    adjacentChars.forEach(({ prev, next }) => {
                        if (prev && next) {
                            // Find the indices of the previous and next characters in the names array
                            const prevIndex = names.indexOf(prev);
                            const nextIndex = names.indexOf(next);
                            // Update the matrix to indicate the connection between the previous and next characters
                            matrix[prevIndex][nextIndex] += 1;
                        }
                    });
                
                    return { matrix, names };
                }
                

                function createChordDiagram(dataset) {
                    const { matrix, names } = dataset;
                    const width = 600;
                    const height = 500;
                    const outerRadius = Math.min(width, height) * 0.5 - 40;
                    const innerRadius = outerRadius - 30;
                
                    // Generate a color scale for distinct characters
                    const colorScale = d3.scaleOrdinal()
                        .domain(names)
                        .range(d3.schemeCategory10);
                
                    // Create a gradient scale for consonant colors
                    const consonantColorScale = d3.scaleLinear()
                        .domain([0, names.filter(name => /[bcdfghjklmnpqrstvwxz]/.test(name)).length - 1])
                        .range(["#ff7f0e", "#8c2d04"]); // Define the range of colors for consonants
                
                    // Create a gradient scale for vowel colors
                    const vowelColorScale = d3.scaleLinear()
                        .domain([0, names.filter(name => /[aeiouy]/.test(name)).length - 1])
                        .range(["#1f77b4", "#0b3961"]); // Define the range of colors for vowels
                
                    // Create a gradient scale for punctuation colors
                    const punctuationColorScale = d3.scaleLinear()
                        .domain([0, names.filter(name => /[.,;:?!]/.test(name)).length - 1])
                        .range(["#2ca02c", "#0f4d0c"]); // Define the range of colors for punctuations
                
                    const chord = d3.chord()
                        .padAngle(0.05)
                        .sortSubgroups(d3.descending)
                        .sortChords(d3.descending);
                
                    const arc = d3.arc()
                        .innerRadius(innerRadius)
                        .outerRadius(outerRadius);
                
                    const ribbon = d3.ribbon()
                        .radius(innerRadius);
                
                    const svg = d3.select('#chord_svg')
                        .attr('width', width)
                        .attr('height', height)
                        .append('g')
                        .attr('transform', `translate(${width / 2},${height / 2 - 50})`);
                
                    const chords = chord(matrix);
                
                    svg.append('g')
                        .selectAll('path')
                        .data(chords)
                        .join('path')
                        .attr('d', ribbon)
                        .attr('fill', d => {
                            // Determine the color based on the type of the previous character
                            const prevIndex = d.source.index;
                            const prevChar = names[prevIndex];
                            if (/[bcdfghjklmnpqrstvwxz]/.test(prevChar)) {
                                return consonantColorScale(prevIndex);
                            } else if (/[aeiouy]/.test(prevChar)) {
                                return vowelColorScale(prevIndex);
                            } else if (/[.,;:?!]/.test(prevChar)) {
                                return punctuationColorScale(prevIndex);
                            } else {
                                return colorScale(prevChar);
                            }
                        })
                        .attr('stroke', d => {
                            const prevIndex = d.source.index;
                            const prevChar = names[prevIndex];
                            const color = /[bcdfghjklmnpqrstvwxz]/.test(prevChar)
                                ? consonantColorScale(prevIndex)
                                : /[aeiouy]/.test(prevChar)
                                ? vowelColorScale(prevIndex)
                                : /[.,;:?!]/.test(prevChar)
                                ? punctuationColorScale(prevIndex)
                                : colorScale(prevChar);
                            return d3.rgb(color).darker();
                        })
                        .append('title')
                        .text(d => `${names[d.source.index]} → ${names[d.target.index]}: ${d.source.value}`);
                }
                
                
            });