import { createComponent, JSX, mergeProps } from 'solid-js';
import { render, hydrate } from 'solid-js/web';
import { getRoot, getFragment } from './nodes';
import processScript from './process-script';

type Island<P> = (
  id: string,
  props: P,
  strategy: Strategy | undefined,
  hydratable: boolean,
  hasChildren: boolean,
) => Promise<void>;
type IslandComp<P> = (props: P & { children?: JSX.Element }) => JSX.Element;

export type Strategy =
  | ['visible']
  | ['load']
  | ['idle']
  | ['animation-frame']
  | ['media', string]
  | ['delay', number]
  | ['interaction', string[] | boolean]
  | ['ready-state', DocumentReadyState];

export type IslandComponent<P> = P & {
  'client:load'?: boolean;
  'client:visible'?: boolean;
  'client:media'?: string;
  'client:only'?: boolean;
  'client:idle'?: boolean;
  'client:animation-frame'?: boolean;
  'client:delay'?: number;
  'client:interaction'?: string[] | boolean;
  'client:ready-state'?: DocumentReadyState;
};

async function renderRoot(
  strategy: Strategy | undefined,
  marker: Element,
  renderCallback: () => void,
): Promise<(() => void) | undefined> {
  if (strategy) {
    switch (strategy[0]) {
      case 'media':
        return (await import('oasal-scheduler/media')).default(strategy[1], renderCallback);
      case 'load':
        return (await import('oasal-scheduler/load')).default(renderCallback);
      case 'visible':
        return (await import('oasal-scheduler/visible')).default(marker, renderCallback, true);
      case 'idle':
        return (await import('oasal-scheduler/idle')).default(renderCallback);
      case 'animation-frame':
        return (await import('oasal-scheduler/animation-frame')).default(renderCallback);
      case 'delay':
        return (await import('oasal-scheduler/delay')).default(strategy[1], renderCallback);
      case 'interaction':
        return (await import('oasal-scheduler/interaction')).default(strategy[1], marker, renderCallback);
      case 'ready-state':
        return (await import('oasal-scheduler/ready-state')).default(strategy[1], renderCallback);
      default:
        break;
    }
  }
  renderCallback();
  return undefined;
}

export default function createIsland<P>(
  source: () => Promise<{ default: IslandComp<P> }>,
): Island<P> {
  return async (id, props, strategy, hydratable, hasChildren) => {
    const marker = getRoot(id);
    const Comp = (await source()).default;

    await renderRoot(strategy, marker, () => {
      const root = () => {
        if (hasChildren) {
          const fragment = getFragment(id);
          return (
            createComponent(Comp, mergeProps(props, {
              get children() {
                if (fragment) {
                  const node = fragment.content.firstChild;
                  if (node) {
                    processScript(node);
                    return node;
                  }
                }
                return null;
              },
            }) as P & { children?: JSX.Element })
          );
        }
        return createComponent(Comp, props);
      };

      if (hydratable) {
        hydrate(root, marker, {
          renderId: id,
        });
      } else {
        render(root, marker);
      }
    });
  };
}
