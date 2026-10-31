import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from './schemas/question.schema';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService implements OnModuleInit {
  constructor(
    @InjectModel(Question.name) private questionModel: Model<QuestionDocument>,
  ) {}

  async onModuleInit() {
    const count = await this.questionModel.countDocuments();
    if (count === 0) {
      await this.seedDefaultQuestions();
    }
  }

  async create(dto: CreateQuestionDto): Promise<Question> {
    const question = new this.questionModel({
      ...dto,
      isCustom: dto.isCustom ?? true,
      active: true,
    });
    return question.save();
  }

  async findAll(filter: any = {}): Promise<Question[]> {
    return this.questionModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<Question | null> {
    return this.questionModel.findById(id).exec();
  }

  async update(id: string, updateData: Partial<CreateQuestionDto>): Promise<Question | null> {
    return this.questionModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
  }

  async delete(id: string): Promise<boolean> {
    const res = await this.questionModel.findByIdAndDelete(id).exec();
    return !!res;
  }

  async getRandomSet(count: number = 15): Promise<Question[]> {
    const allQuestions = await this.questionModel.find({ active: true }).lean().exec();
    if (allQuestions.length <= count) {
      return this.shuffleArray([...allQuestions]);
    }

    // Stratified sampling to ensure balanced HTML, CSS, and Responsive questions
    const htmlQuestions = allQuestions.filter(q => q.category === 'HTML');
    const cssQuestions = allQuestions.filter(q => q.category === 'CSS');
    const respQuestions = allQuestions.filter(q => q.category === 'Responsive Design' || q.category === 'Web Basics');

    const shuffledHtml = this.shuffleArray(htmlQuestions);
    const shuffledCss = this.shuffleArray(cssQuestions);
    const shuffledResp = this.shuffleArray(respQuestions);

    const selected: any[] = [];
    // Pick 6 HTML, 6 CSS, 3 Responsive/Web Basics
    selected.push(...shuffledHtml.slice(0, 6));
    selected.push(...shuffledCss.slice(0, 6));
    selected.push(...shuffledResp.slice(0, 3));

    // If still need more, fill from remainder
    if (selected.length < count) {
      const remaining = allQuestions.filter(q => !selected.some(s => s._id.toString() === q._id.toString()));
      selected.push(...this.shuffleArray(remaining).slice(0, count - selected.length));
    }

    return this.shuffleArray(selected);
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  async seedDefaultQuestions(): Promise<{ count: number }> {
    const initialQuestions: Array<Partial<Question>> = [
      // --- HTML QUESTIONS ---
      {
        questionText: 'Which HTML5 semantic element is most suitable for encapsulating independent, self-contained blog posts or news items?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: '<section>' },
          { id: 'B', text: '<article>' },
          { id: 'C', text: '<aside>' },
          { id: 'D', text: '<div>' },
        ],
        correctAnswer: 'B',
        explanation: '<article> represents an independent piece of content meant to be distributable and reusable on its own, like blog articles or news stories.',
        isCustom: false,
        tags: ['html5', 'semantics'],
      },
      {
        questionText: 'What is the primary purpose of the "alt" attribute in the <img> tag?',
        codeSnippet: '<img src="campus.jpg" alt="WeGrow Skill Campus Main Building">',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'To specify the tooltip popup text when hovering over the image' },
          { id: 'B', text: 'To provide fallback text for screen readers and when images fail to load' },
          { id: 'C', text: 'To define alternate image resolutions for responsive screens' },
          { id: 'D', text: 'To rank the image higher in Google Image Search' },
        ],
        correctAnswer: 'B',
        explanation: 'The alt attribute provides alternative text for accessibility (screen readers) and displays as fallback if the image fails to load.',
        isCustom: false,
        tags: ['accessibility', 'images'],
      },
      {
        questionText: 'In HTML forms, which attribute ensures the user cannot submit the form if an input field is empty?',
        codeSnippet: '<input type="email" name="user_email" _______>',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'validate="true"' },
          { id: 'B', text: 'mandatory' },
          { id: 'C', text: 'required' },
          { id: 'D', text: 'disabled="false"' },
        ],
        correctAnswer: 'C',
        explanation: 'The "required" boolean attribute instructs modern browsers to enforce client-side validation before form submission.',
        isCustom: false,
        tags: ['forms', 'validation'],
      },
      {
        questionText: 'What is the correct DOCTYPE declaration for modern HTML5 documents?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: '<!DOCTYPE html>' },
          { id: 'B', text: '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN">' },
          { id: 'C', text: '<?xml version="1.0"?>' },
          { id: 'D', text: '<!DOCTYPE html5>' },
        ],
        correctAnswer: 'A',
        explanation: '<!DOCTYPE html> is the concise and standard doctype declaration required for HTML5 compliance.',
        isCustom: false,
        tags: ['standards', 'html5'],
      },
      {
        questionText: 'Which HTML element should be used to display a drop-down selection list?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: '<list>' },
          { id: 'B', text: '<dropdown>' },
          { id: 'C', text: '<select>' },
          { id: 'D', text: '<input type="dropdown">' },
        ],
        correctAnswer: 'C',
        explanation: 'The <select> element contains multiple <option> elements to render a drop-down menu in HTML forms.',
        isCustom: false,
        tags: ['forms', 'inputs'],
      },
      {
        questionText: 'Which input type is specifically designed for entering phone numbers with mobile virtual keypad optimization?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: '<input type="number">' },
          { id: 'B', text: '<input type="tel">' },
          { id: 'C', text: '<input type="phone">' },
          { id: 'D', text: '<input type="digits">' },
        ],
        correctAnswer: 'B',
        explanation: '<input type="tel"> opens the dial-pad on mobile smartphones without restricting input strictly to mathematical numbers.',
        isCustom: false,
        tags: ['forms', 'mobile'],
      },
      {
        questionText: 'What is the difference between <b> and <strong> elements in HTML5?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'There is no difference; they are exact synonyms' },
          { id: 'B', text: '<strong> conveys semantic importance/urgency for screen readers, while <b> is purely visual bold styling' },
          { id: 'C', text: '<b> is deprecated in HTML5 and does not render' },
          { id: 'D', text: '<strong> cannot be styled with CSS' },
        ],
        correctAnswer: 'B',
        explanation: '<strong> represents semantic importance or emphasis that assistive tech announces, whereas <b> is stylistic bolding.',
        isCustom: false,
        tags: ['semantics', 'accessibility'],
      },
      {
        questionText: 'Which meta tag configuration ensures a web page scales properly on mobile screens?',
        codeSnippet: '<meta name="viewport" content="__________">',
        category: 'HTML',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'width=device-width, initial-scale=1.0' },
          { id: 'B', text: 'mobile-optimized=yes, zoom=auto' },
          { id: 'C', text: 'screen-size=responsive, scale=100%' },
          { id: 'D', text: 'width=100%, height=100%' },
        ],
        correctAnswer: 'A',
        explanation: 'content="width=device-width, initial-scale=1.0" establishes the viewport width to match the screen width and sets initial zoom level.',
        isCustom: false,
        tags: ['responsive', 'meta'],
      },
      {
        questionText: 'Which HTML5 element is used to group form controls and provide a caption for them?',
        codeSnippet: '<________>\n  <legend>Personal Information</legend>\n  <input ...>\n</________>',
        category: 'HTML',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: '<formgroup>' },
          { id: 'B', text: '<fieldset>' },
          { id: 'C', text: '<box>' },
          { id: 'D', text: '<section>' },
        ],
        correctAnswer: 'B',
        explanation: '<fieldset> groups related input fields, and <legend> provides the accessible caption or label for that group.',
        isCustom: false,
        tags: ['forms', 'structure'],
      },
      {
        questionText: 'In an anchor tag, what attribute and value opens the hyperlink in a brand new browser tab?',
        codeSnippet: '<a href="https://wegrow.org" ________>Visit WeGrow</a>',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'target="_blank"' },
          { id: 'B', text: 'target="_new"' },
          { id: 'C', text: 'window="new"' },
          { id: 'D', text: 'open="tab"' },
        ],
        correctAnswer: 'A',
        explanation: 'target="_blank" directs the browser to open the linked resource in a new browsing context/tab.',
        isCustom: false,
        tags: ['links', 'basics'],
      },
      {
        questionText: 'Why should you include rel="noopener noreferrer" when using target="_blank"?',
        codeSnippet: '<a href="https://external.com" target="_blank" rel="noopener noreferrer">External</a>',
        category: 'HTML',
        difficulty: 'Advanced',
        options: [
          { id: 'A', text: 'To speed up the page loading by 50%' },
          { id: 'B', text: 'To prevent security vulnerabilities where the target page could hijack the window.opener object' },
          { id: 'C', text: 'To allow cross-origin cookies to be shared' },
          { id: 'D', text: 'To avoid ad blockers from blocking the link' },
        ],
        correctAnswer: 'B',
        explanation: 'rel="noopener noreferrer" prevents reverse tabnabbing by ensuring the opened page cannot manipulate window.opener on the referring tab.',
        isCustom: false,
        tags: ['security', 'html5'],
      },
      {
        questionText: 'What is the semantic purpose of the <main> tag in an HTML document?',
        codeSnippet: '',
        category: 'HTML',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'It wraps the header and navigation bar' },
          { id: 'B', text: 'It contains the dominant, central content unique to the document, excluding headers, sidebars, and footers' },
          { id: 'C', text: 'It acts as the root element replacing <body>' },
          { id: 'D', text: 'It loads essential JavaScript scripts' },
        ],
        correctAnswer: 'B',
        explanation: 'The <main> element represents the dominant content of the <body> of a document, appearing once per document.',
        isCustom: false,
        tags: ['semantics', 'html5'],
      },

      // --- CSS QUESTIONS ---
      {
        questionText: 'What does the standard CSS Box Model consist of, from innermost to outermost?',
        codeSnippet: '',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'Content, Border, Padding, Margin' },
          { id: 'B', text: 'Content, Padding, Border, Margin' },
          { id: 'C', text: 'Margin, Border, Padding, Content' },
          { id: 'D', text: 'Content, Margin, Padding, Border' },
        ],
        correctAnswer: 'B',
        explanation: 'The CSS Box Model order from inside out is: Content -> Padding -> Border -> Margin.',
        isCustom: false,
        tags: ['box-model', 'css-basics'],
      },
      {
        questionText: 'What is the advantage of using "box-sizing: border-box;" across all elements?',
        codeSnippet: '* { box-sizing: border-box; }',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'It automatically adds a visible 1px solid border around all elements' },
          { id: 'B', text: 'Width and height include padding and borders, preventing elements from expanding beyond their specified dimensions' },
          { id: 'C', text: 'It disables margins on all child elements' },
          { id: 'D', text: 'It converts block elements into inline elements' },
        ],
        correctAnswer: 'B',
        explanation: 'With border-box, the declared width/height includes content, padding, and border, making sizing predictable and layouts easier to control.',
        isCustom: false,
        tags: ['box-sizing', 'layout'],
      },
      {
        questionText: 'In CSS Flexbox, which property aligns flex items along the main axis (horizontal by default)?',
        codeSnippet: '.navbar { display: flex; ________: space-between; }',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'align-items' },
          { id: 'B', text: 'justify-content' },
          { id: 'C', text: 'align-content' },
          { id: 'D', text: 'flex-direction' },
        ],
        correctAnswer: 'B',
        explanation: 'justify-content distributes space and aligns flex items along the main axis (horizontal in row direction).',
        isCustom: false,
        tags: ['flexbox', 'alignment'],
      },
      {
        questionText: 'In CSS Flexbox, which property aligns items vertically along the cross axis in a row layout?',
        codeSnippet: '.card-header { display: flex; ________: center; }',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'align-items' },
          { id: 'B', text: 'justify-items' },
          { id: 'C', text: 'vertical-align' },
          { id: 'D', text: 'align-self' },
        ],
        correctAnswer: 'A',
        explanation: 'align-items controls cross-axis alignment for all direct flex items inside a flex container.',
        isCustom: false,
        tags: ['flexbox', 'alignment'],
      },
      {
        questionText: 'Which CSS selector has the HIGHEST specificity according to the CSS cascade rules?',
        codeSnippet: '',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: '.btn.btn-primary (two classes)' },
          { id: 'B', text: '#header-logo (single ID)' },
          { id: 'C', text: 'div > p.highlight (tag and class)' },
          { id: 'D', text: 'nav ul li a (four element tags)' },
        ],
        correctAnswer: 'B',
        explanation: 'An ID selector has a specificity weight of (0, 1, 0, 0), which overrides any number of classes (0, 0, X, 0) and tags.',
        isCustom: false,
        tags: ['specificity', 'cascade'],
      },
      {
        questionText: 'When an element has "position: absolute;", what does it position itself relative to?',
        codeSnippet: '.tooltip { position: absolute; top: 10px; right: 10px; }',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'Always the browser viewport window' },
          { id: 'B', text: 'Its closest ancestor element that has a position other than "static"' },
          { id: 'C', text: 'Its immediate parent, regardless of that parent\'s position property' },
          { id: 'D', text: 'The top left corner of the HTML document body' },
        ],
        correctAnswer: 'B',
        explanation: 'An absolutely positioned element is positioned relative to its nearest positioned ancestor (relative, absolute, fixed, or sticky).',
        isCustom: false,
        tags: ['positioning', 'layout'],
      },
      {
        questionText: 'What is the key difference between "display: none;" and "visibility: hidden;"?',
        codeSnippet: '',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: '"display: none" leaves empty space on the page; "visibility: hidden" collapses the space' },
          { id: 'B', text: '"display: none" completely removes the element from the layout flow; "visibility: hidden" hides it while still occupying its physical layout space' },
          { id: 'C', text: 'They both behave identically in modern browsers' },
          { id: 'D', text: '"visibility: hidden" disables all child CSS styles permanently' },
        ],
        correctAnswer: 'B',
        explanation: '"display: none" removes the element from rendering flow entirely. "visibility: hidden" makes it invisible while preserving its width and height space.',
        isCustom: false,
        tags: ['display', 'visibility'],
      },
      {
        questionText: 'Which CSS unit is relative to the root font-size (<html> tag font-size)?',
        codeSnippet: 'h1 { font-size: 2.5____; }',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'em' },
          { id: 'B', text: 'rem' },
          { id: 'C', text: 'vw' },
          { id: 'D', text: 'ch' },
        ],
        correctAnswer: 'B',
        explanation: 'rem stands for "root em" and is always calculated relative to the font-size of the root <html> element (usually default 16px).',
        isCustom: false,
        tags: ['units', 'typography'],
      },
      {
        questionText: 'How can you perfectly center a child element both vertically and horizontally inside a container using CSS Grid?',
        codeSnippet: '.parent {\n  display: grid;\n  ________: center;\n  height: 300px;\n}',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'align-content' },
          { id: 'B', text: 'place-items' },
          { id: 'C', text: 'center-all' },
          { id: 'D', text: 'justify-all' },
        ],
        correctAnswer: 'B',
        explanation: 'place-items: center is a shorthand in CSS Grid for align-items: center and justify-items: center simultaneously.',
        isCustom: false,
        tags: ['grid', 'centering'],
      },
      {
        questionText: 'Which pseudo-class applies styles when an interactive element receives keyboard navigation focus?',
        codeSnippet: 'button:________ {\n  outline: 2px solid #ff7800;\n}',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: ':hover' },
          { id: 'B', text: ':active' },
          { id: 'C', text: ':focus or :focus-visible' },
          { id: 'D', text: ':visited' },
        ],
        correctAnswer: 'C',
        explanation: ':focus-visible provides styling when an element is focused via keyboard navigation, essential for accessible user interfaces.',
        isCustom: false,
        tags: ['pseudo-classes', 'accessibility'],
      },
      {
        questionText: 'What does "z-index" do in CSS, and what prerequisite does it require?',
        codeSnippet: '',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'Sets the zoom level of the page; requires CSS transform' },
          { id: 'B', text: 'Controls the 3D stacking order along the z-axis; requires a positioned element (not static) or flex/grid item' },
          { id: 'C', text: 'Defines transparency; requires opacity: 1' },
          { id: 'D', text: 'Rotates elements 360 degrees; requires transition duration' },
        ],
        correctAnswer: 'B',
        explanation: 'z-index sets stacking order of overlapping elements and only takes effect on elements with a position other than static (or flex/grid items).',
        isCustom: false,
        tags: ['stacking-context', 'z-index'],
      },
      {
        questionText: 'In CSS Grid, what does the following rule achieve: "grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));"?',
        codeSnippet: '.gallery {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));\n}',
        category: 'CSS',
        difficulty: 'Advanced',
        options: [
          { id: 'A', text: 'Fixes the grid to exactly 4 columns on all screen sizes' },
          { id: 'B', text: 'Creates an automatic responsive grid where cards wrap and scale cleanly without needing media queries' },
          { id: 'C', text: 'Shrinks every card to 250px and centers them' },
          { id: 'D', text: 'Requires JavaScript to adjust columns dynamically' },
        ],
        correctAnswer: 'B',
        explanation: 'auto-fit with minmax(250px, 1fr) creates fully fluid responsive grid columns that wrap automatically as viewport changes.',
        isCustom: false,
        tags: ['grid', 'responsive'],
      },

      // --- RESPONSIVE DESIGN & WEB BASICS ---
      {
        questionText: 'What is a "mobile-first" approach in responsive web design CSS?',
        codeSnippet: '',
        category: 'Responsive Design',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'Writing styles for desktop first, then adding max-width media queries for smaller screens' },
          { id: 'B', text: 'Writing base default CSS styles for small mobile screens first, then progressively enhancing using min-width media queries' },
          { id: 'C', text: 'Creating an entirely separate website URL like m.example.com' },
          { id: 'D', text: 'Restricting the website to only open on Android and iOS devices' },
        ],
        correctAnswer: 'B',
        explanation: 'Mobile-first design establishes baseline styles for mobile devices first, then scales up using @media (min-width: ...) rules.',
        isCustom: false,
        tags: ['mobile-first', 'media-queries'],
      },
      {
        questionText: 'Which media query will trigger ONLY when the screen width is 768px or wider?',
        codeSnippet: '',
        category: 'Responsive Design',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: '@media (max-width: 768px) { ... }' },
          { id: 'B', text: '@media (min-width: 768px) { ... }' },
          { id: 'C', text: '@media screen (width == 768px) { ... }' },
          { id: 'D', text: '@media (device-width: 768px) { ... }' },
        ],
        correctAnswer: 'B',
        explanation: '@media (min-width: 768px) applies styling rules when the viewport width is 768px or greater (typical tablet/desktop breakpoint).',
        isCustom: false,
        tags: ['media-queries', 'breakpoints'],
      },
      {
        questionText: 'How can you prevent an image from overflowing out of its parent card in responsive web design?',
        codeSnippet: 'img.responsive-image {\n  ________: 100%;\n  height: auto;\n}',
        category: 'Responsive Design',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'min-width' },
          { id: 'B', text: 'max-width' },
          { id: 'C', text: 'width: fixed' },
          { id: 'D', text: 'overflow: hidden' },
        ],
        correctAnswer: 'B',
        explanation: 'max-width: 100% and height: auto allows the image to scale down to fit smaller screens without exceeding its native resolution.',
        isCustom: false,
        tags: ['responsive-images', 'css'],
      },
      {
        questionText: 'What CSS property allows text to cleanly show an ellipsis (...) when it exceeds the width of its container?',
        codeSnippet: '.card-title {\n  white-space: nowrap;\n  overflow: hidden;\n  ________: ellipsis;\n}',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'text-overflow' },
          { id: 'B', text: 'text-truncate' },
          { id: 'C', text: 'overflow-wrap' },
          { id: 'D', text: 'font-display' },
        ],
        correctAnswer: 'A',
        explanation: 'text-overflow: ellipsis signals to truncate overflowed text with three dots (...) when combined with nowrap and overflow: hidden.',
        isCustom: false,
        tags: ['text', 'styling'],
      },
      {
        questionText: 'Which CSS property defines smooth transitions when hover or focus states change?',
        codeSnippet: '.btn {\n  background-color: #0f3460;\n  ________: background-color 0.3s ease-in-out;\n}\n.btn:hover {\n  background-color: #ff7800;\n}',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'animation-play' },
          { id: 'B', text: 'transition' },
          { id: 'C', text: 'transform' },
          { id: 'D', text: 'smooth-render' },
        ],
        correctAnswer: 'B',
        explanation: 'The transition property allows changes in CSS properties to occur smoothly over a specified duration.',
        isCustom: false,
        tags: ['animations', 'transitions'],
      },
      {
        questionText: 'What is the function of the "gap" property in Flexbox and CSS Grid layouts?',
        codeSnippet: '.grid-container {\n  display: grid;\n  gap: 1.5rem;\n}',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'It sets outer margins around the parent container' },
          { id: 'B', text: 'It establishes spacing between row and column items without needing margin hacks on individual items' },
          { id: 'C', text: 'It creates blank columns at the beginning and end' },
          { id: 'D', text: 'It sets the line-height between paragraphs' },
        ],
        correctAnswer: 'B',
        explanation: 'gap defines the gutter space between grid rows/columns or flex items directly and cleanly without manual margin calculations.',
        isCustom: false,
        tags: ['layout', 'flexbox', 'grid'],
      },
      {
        questionText: 'Which HTTP status code signifies that a requested webpage was not found on the server?',
        codeSnippet: '',
        category: 'Web Basics',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: '200 OK' },
          { id: 'B', text: '301 Moved Permanently' },
          { id: 'C', text: '404 Not Found' },
          { id: 'D', text: '500 Internal Server Error' },
        ],
        correctAnswer: 'C',
        explanation: '404 Not Found is the standard client error code indicating the server cannot locate the requested resource.',
        isCustom: false,
        tags: ['http', 'web-basics'],
      },
      {
        questionText: 'What does CSS stand for?',
        codeSnippet: '',
        category: 'Web Basics',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'Creative Style Sheets' },
          { id: 'B', text: 'Cascading Style Sheets' },
          { id: 'C', text: 'Computer Style Syntax' },
          { id: 'D', text: 'Colorful Standard Styles' },
        ],
        correctAnswer: 'B',
        explanation: 'CSS stands for Cascading Style Sheets, describing how HTML elements should be rendered on screen or media.',
        isCustom: false,
        tags: ['basics'],
      },
      {
        questionText: 'What is the role of the "defer" attribute when loading a script tag in HTML?',
        codeSnippet: '<script src="app.js" defer></script>',
        category: 'Web Basics',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: 'It stops the script from ever executing' },
          { id: 'B', text: 'It downloads the script in parallel without blocking HTML parsing, and executes it in order after HTML is parsed' },
          { id: 'C', text: 'It runs the script before the DOM starts rendering' },
          { id: 'D', text: 'It caches the script in local storage permanently' },
        ],
        correctAnswer: 'B',
        explanation: 'The defer attribute allows non-blocking script downloads while preserving execution order after DOM parsing finishes.',
        isCustom: false,
        tags: ['performance', 'scripts'],
      },
      {
        questionText: 'Which CSS property is used to add shadows to cards or box elements?',
        codeSnippet: '.card {\n  ________: 0 4px 6px -1px rgba(0, 0, 0, 0.1);\n}',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'text-shadow' },
          { id: 'B', text: 'box-shadow' },
          { id: 'C', text: 'element-shadow' },
          { id: 'D', text: 'filter: shadow()' },
        ],
        correctAnswer: 'B',
        explanation: 'box-shadow attaches one or more drop-shadows to an element frame.',
        isCustom: false,
        tags: ['styling', 'shadows'],
      },
      {
        questionText: 'What does "flex-wrap: wrap;" do in a Flexbox container?',
        codeSnippet: '.tag-list {\n  display: flex;\n  flex-wrap: wrap;\n}',
        category: 'CSS',
        difficulty: 'Beginner',
        options: [
          { id: 'A', text: 'Forces all items to stay on a single horizontal line, shrinking them' },
          { id: 'B', text: 'Allows flex items to break onto multiple lines if there is not enough room on the current line' },
          { id: 'C', text: 'Reverses the order of items vertically' },
          { id: 'D', text: 'Wraps each item inside a border' },
        ],
        correctAnswer: 'B',
        explanation: 'flex-wrap: wrap allows items to flow onto new rows or columns when they overflow the container width.',
        isCustom: false,
        tags: ['flexbox', 'layout'],
      },
      {
        questionText: 'In modern CSS, how do you define a CSS custom property (CSS Variable) accessible globally?',
        codeSnippet: '________ {\n  --brand-primary: #0f3460;\n  --brand-orange: #ff7800;\n}',
        category: 'CSS',
        difficulty: 'Intermediate',
        options: [
          { id: 'A', text: '$root' },
          { id: 'B', text: ':root' },
          { id: 'C', text: '@variables' },
          { id: 'D', text: 'body.global' },
        ],
        correctAnswer: 'B',
        explanation: ':root matches the document root (<html>) and is standard convention for defining global CSS custom properties (variables).',
        isCustom: false,
        tags: ['css-variables', 'modern-css'],
      },
    ];

    await this.questionModel.insertMany(initialQuestions);
    return { count: initialQuestions.length };
  }
}

