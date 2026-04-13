import random
from typing import Dict, List, Set


def draw_secret_santa(
    participant_ids: List[int],
    exclusions: Dict[int, Set[int]],
    max_attempts: int = 2000,
) -> Dict[int, int]:
    """
    Tirage au sort Secret Santa.

    Args:
        participant_ids: liste des IDs participants
        exclusions: {giver_id: {excluded_receiver_ids}} — paires interdites
        max_attempts: nombre max de tentatives avant d'abandonner

    Returns:
        {giver_id: receiver_id}

    Raises:
        ValueError si aucune solution n'est trouvée
    """
    if len(participant_ids) < 2:
        raise ValueError("Il faut au moins 2 participants")

    ids = participant_ids.copy()

    for _ in range(max_attempts):
        receivers = ids.copy()
        random.shuffle(receivers)

        assignment = {}
        valid = True
        for giver, receiver in zip(ids, receivers):
            forbidden = exclusions.get(giver, set()) | {giver}
            if receiver in forbidden:
                valid = False
                break
            assignment[giver] = receiver

        if valid:
            return assignment

    raise ValueError(
        "Impossible de trouver un tirage valide avec ces contraintes. "
        "Vérifiez que les exclusions ne bloquent pas toutes les combinaisons possibles."
    )
