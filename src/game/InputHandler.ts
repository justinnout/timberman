import { Side } from '../utils/types';

export interface InputCallbacks {
  onLeft: () => void;
  onRight: () => void;
  onAnyKey: () => void;
}

export class InputHandler {
  private callbacks: InputCallbacks;
  private element: HTMLElement | null = null;
  private readonly leftKeys = new Set(['ArrowLeft', 'KeyA', 'a', 'A']);
  private readonly rightKeys = new Set(['ArrowRight', 'KeyD', 'd', 'D']);

  constructor(callbacks: InputCallbacks) {
    this.callbacks = callbacks;
  }

  attach(element: HTMLElement): void {
    this.element = element;
    document.addEventListener('keydown', this.handleKeyDown);
    element.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    element.addEventListener('mousedown', this.handleMouseDown);
  }

  detach(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    if (this.element) {
      this.element.removeEventListener('touchstart', this.handleTouchStart);
      this.element.removeEventListener('mousedown', this.handleMouseDown);
    }
    this.element = null;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    console.log('Key pressed:', e.code, e.key);

    // Ignore key events when typing in input fields
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      return;
    }

    // Prevent key repeat
    if (e.repeat) return;

    // Prevent default for game keys
    if (this.leftKeys.has(e.code) || this.rightKeys.has(e.code) ||
        this.leftKeys.has(e.key) || this.rightKeys.has(e.key)) {
      e.preventDefault();
    }

    if (this.leftKeys.has(e.code) || this.leftKeys.has(e.key)) {
      console.log('Left callback');
      this.callbacks.onLeft();
    } else if (this.rightKeys.has(e.code) || this.rightKeys.has(e.key)) {
      console.log('Right callback');
      this.callbacks.onRight();
    } else {
      console.log('Any key callback');
      this.callbacks.onAnyKey();
    }
  };

  private handleTouchStart = (e: TouchEvent): void => {
    const target = e.target as HTMLElement;

    // Allow touches on buttons and inputs to pass through
    if (target.closest('button') || target.closest('input')) {
      return;
    }

    e.preventDefault();

    const touch = e.touches[0];
    const side = this.getTouchSide(touch.clientX);

    if (side === 'left') {
      this.callbacks.onLeft();
    } else {
      this.callbacks.onRight();
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    console.log('InputHandler mousedown, target:', target.tagName, target.id || target.className);

    // Ignore clicks on buttons and inputs
    if (target.closest('button') || target.closest('input')) {
      console.log('Ignoring button/input click');
      return;
    }

    const side = this.getTouchSide(e.clientX);
    console.log('Triggering side:', side);

    if (side === 'left') {
      this.callbacks.onLeft();
    } else {
      this.callbacks.onRight();
    }
  };

  private getTouchSide(clientX: number): Side {
    const screenWidth = window.innerWidth;
    const center = screenWidth / 2;

    return clientX < center ? 'left' : 'right';
  }

  updateCallbacks(callbacks: Partial<InputCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
